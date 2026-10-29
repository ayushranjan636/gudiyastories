import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { hasDatabase } from "@/server/env";

/**
 * Where the Razorpay keys come from:
 *
 *  1. The server environment (RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in .env), if set.
 *  2. Otherwise Admin → Settings → Online payments (Razorpay), saved in the
 *     database with the secrets encrypted (AES-256-GCM, key derived from AUTH_SECRET).
 *
 * As soon as valid keys are present, checkout takes real payments through Razorpay.
 * There is no pretend gateway: no keys means no online payment (COD / WhatsApp only).
 */

export type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  source: "env" | "admin";
};

export const SETTING_KEY = "razorpay";

type Stored = { keyId?: string; keySecret?: string; webhookSecret?: string | null; savedAt?: string; savedBy?: string };

function cipherKey() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set, so payment keys can't be stored safely.");
  return createHash("sha256").update(`gudiya:razorpay-credentials:${s}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cipherKey(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

export function decryptSecret(box: string): string | null {
  try {
    const [v, iv, tag, data] = box.split(":");
    if (v !== "v1" || !iv || !tag || !data) return null;
    const d = createDecipheriv("aes-256-gcm", cipherKey(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch {
    return null; // AUTH_SECRET changed, or the value was tampered with
  }
}

export function keyKind(keyId: string): "live" | "test" | null {
  return keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : null;
}

/**
 * The live site only takes live keys. With test keys anyone could "pay" with
 * Razorpay's test UPI ID and get real books shipped. Test keys still work on
 * your own computer (`npm run dev` / `npm run local`).
 */
export function keyAllowedHere(keyId: string) {
  const kind = keyKind(keyId);
  if (!kind) return false;
  return kind === "live" || process.env.NODE_ENV !== "production";
}

function fromEnv(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret || !keyAllowedHere(keyId)) return null;
  return { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null, source: "env" };
}

async function readStored(): Promise<Stored | null> {
  if (!hasDatabase()) return null;
  const { db } = await import("@/server/db");
  const row = await db.setting.findUnique({ where: { key: SETTING_KEY } });
  return (row?.value as Stored | undefined) ?? null;
}

// Read on nearly every checkout and admin page, so keep it for a short while.
const TTL_MS = 30_000;
const g = globalThis as unknown as { __gsRzp?: { at: number; value: RazorpayCredentials | null } };

export async function getRazorpayCredentials(): Promise<RazorpayCredentials | null> {
  const env = fromEnv();
  if (env) return env;
  if (g.__gsRzp && Date.now() - g.__gsRzp.at < TTL_MS) return g.__gsRzp.value;
  let value: RazorpayCredentials | null = null;
  try {
    const s = await readStored();
    const keySecret = s?.keyId && s.keySecret ? decryptSecret(s.keySecret) : null;
    if (s?.keyId && keySecret && keyAllowedHere(s.keyId)) {
      value = { keyId: s.keyId, keySecret, webhookSecret: s.webhookSecret ? decryptSecret(s.webhookSecret) : null, source: "admin" };
    }
  } catch (err) {
    console.error("[payments] could not read Razorpay keys:", err instanceof Error ? err.message : err);
  }
  g.__gsRzp = { at: Date.now(), value };
  return value;
}

export function forgetCachedCredentials() {
  delete g.__gsRzp;
}

/** What the admin screen may show. Never includes a secret. */
export async function credentialsStatus() {
  const env = fromEnv();
  const envId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const partialEnv = Boolean(envId) !== Boolean(process.env.RAZORPAY_KEY_SECRET?.trim());
  // Keys in .env that this server refuses (test keys on the live site, or a typo'd ID).
  const rejectedEnvKeyId = envId && !keyAllowedHere(envId) ? envId : null;
  if (env) return { configured: true, source: "env" as const, keyId: env.keyId, kind: keyKind(env.keyId), webhook: Boolean(env.webhookSecret), savedAt: null, unreadable: false, partialEnv, rejectedEnvKeyId, rejectedStored: false };
  const s = await readStored().catch(() => null);
  const unreadable = Boolean(s?.keySecret) && !decryptSecret(s!.keySecret!);
  const rejectedStored = Boolean(s?.keyId) && !keyAllowedHere(s!.keyId!);
  const configured = Boolean(s?.keyId && s.keySecret) && !unreadable && !rejectedStored;
  return {
    configured,
    source: configured ? ("admin" as const) : null,
    keyId: s?.keyId ?? null,
    kind: s?.keyId ? keyKind(s.keyId) : null,
    webhook: Boolean(s?.webhookSecret),
    savedAt: s?.savedAt ?? null,
    unreadable,
    partialEnv,
    rejectedEnvKeyId,
    rejectedStored,
  };
}
