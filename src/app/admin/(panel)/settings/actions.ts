"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";
import type { Prisma } from "@/generated/prisma/client";

const rupees = z.coerce.number().min(0).max(100000);

const SCHEMAS = {
  store: z.object({
    address: z.string().trim().max(300).nullable(),
    email: z.string().trim().email().nullable().or(z.literal("").transform(() => null)),
    phoneE164: z.string().trim().regex(/^\+91[6-9]\d{9}$/, "Use +91 and 10 digits").nullable().or(z.literal("").transform(() => null)),
    whatsappE164: z.string().trim().regex(/^\+91[6-9]\d{9}$/, "Use +91 and 10 digits").nullable().or(z.literal("").transform(() => null)),
    onlineOnly: z.boolean(),
    hours: z.string().trim().max(120).nullable(),
  }),
  shipping: z.object({
    flatRateRupees: rupees,
    freeShippingThresholdRupees: rupees.nullable(),
    codEnabled: z.boolean(),
    codFeeRupees: rupees,
  }),
  bulkTiers: z.array(z.object({ minQuantity: z.coerce.number().int().min(1), discountPercent: z.coerce.number().min(0).max(80).nullable() })).max(6),
  invoice: z.object({ documentType: z.enum(["BILL_OF_SUPPLY", "TAX_INVOICE"]), gstin: z.string().trim().max(15).nullable(), hsnDefault: z.string().trim().max(10) }),
  social: z.object({
    instagram: z.string().url().nullable().or(z.literal("").transform(() => null)),
    facebook: z.string().url().nullable().or(z.literal("").transform(() => null)),
    youtube: z.string().url().nullable().or(z.literal("").transform(() => null)),
    // Posts shown above the footer: links like https://www.instagram.com/p/ABC123/
    instagramPosts: z
      .array(z.string().trim().regex(/^https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9_.]+\/)?(p|reel|tv)\/[A-Za-z0-9_-]+/, "Instagram posts must be links like https://www.instagram.com/p/…"))
      .max(6, "Up to six posts")
      .default([]),
  }),
} as const;

export async function saveSetting(key: keyof typeof SCHEMAS, input: unknown) {
  const admin = await requireAdmin("OWNER");
  const parsed = SCHEMAS[key].safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  let value: Record<string, unknown> | unknown[] = parsed.data as Record<string, unknown>;
  if (key === "shipping") {
    const s = parsed.data as z.infer<typeof SCHEMAS.shipping>;
    value = {
      flatRatePaise: Math.round(s.flatRateRupees * 100),
      freeShippingThresholdPaise: s.freeShippingThresholdRupees == null ? null : Math.round(s.freeShippingThresholdRupees * 100),
      codEnabled: s.codEnabled,
      codFeePaise: Math.round(s.codFeeRupees * 100),
      serviceablePinCodes: [],
    };
  }
  const before = await db.setting.findUnique({ where: { key } });
  const merged = Array.isArray(value) ? value : { ...((before?.value as Record<string, unknown>) ?? {}), ...value };
  await db.setting.upsert({ where: { key }, create: { key, value: merged as Prisma.InputJsonValue }, update: { value: merged as Prisma.InputJsonValue } });
  await audit(admin, "UPDATE", "Setting", key, before?.value, merged);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function addAdminUser(input: { name: string; email: string; password: string; role: string }) {
  const admin = await requireAdmin("OWNER");
  const d = z
    .object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password: z.string().min(12, "Use at least 12 characters").max(200), role: z.enum(["OWNER", "STAFF"]) })
    .safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0]?.message ?? "Check the form." };
  if (await db.adminUser.findUnique({ where: { email: d.data.email } })) return { ok: false, message: "That email already has an account." };
  const u = await db.adminUser.create({ data: { name: d.data.name, email: d.data.email, role: d.data.role, passwordHash: await bcrypt.hash(d.data.password, 12) } });
  await audit(admin, "CREATE", "AdminUser", u.id, undefined, { email: u.email, role: u.role });
  revalidatePath("/admin/settings");
  return { ok: true, message: `${u.name} can now sign in.` };
}

export async function setAdminActive(id: string, active: boolean) {
  const admin = await requireAdmin("OWNER");
  if (id === admin.id) return { ok: false, message: "You can't switch off your own account." };
  await db.adminUser.update({ where: { id }, data: { active } });
  await audit(admin, "UPDATE", "AdminUser", id, undefined, { active });
  revalidatePath("/admin/settings");
  return { ok: true, message: active ? "Account turned on." : "Account turned off." };
}

export async function changePassword(current: string, next: string) {
  const admin = await requireAdmin();
  if (next.length < 12) return { ok: false, message: "Use at least 12 characters." };
  const u = await db.adminUser.findUnique({ where: { id: admin.id } });
  if (!u || !(await bcrypt.compare(current, u.passwordHash))) return { ok: false, message: "Your current password is wrong." };
  await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  await audit(admin, "UPDATE", "AdminUser", admin.id, undefined, { password: "changed" });
  return { ok: true, message: "Password changed." };
}

/**
 * Saves the Razorpay keys (Owner only). They are checked with Razorpay first,
 * then stored encrypted. From the next checkout on, customers pay through Razorpay.
 * An empty Key Secret keeps the one already saved (so the form never shows it).
 */
export async function saveRazorpayKeys(input: { keyId: string; keySecret: string; webhookSecret: string }) {
  const admin = await requireAdmin("OWNER");
  const { SETTING_KEY, credentialsStatus, decryptSecret, encryptSecret, forgetCachedCredentials, keyAllowedHere } = await import("@/features/payments/credentials");
  const { testCredentials } = await import("@/features/payments/gateway");

  if ((await credentialsStatus()).source === "env") {
    return { ok: false, message: "Razorpay keys are set in the server's .env file, which takes priority. Change them there, or remove them to manage keys here." };
  }
  const d = z
    .object({
      keyId: z.string().trim().regex(/^rzp_(live|test)_[A-Za-z0-9]{6,40}$/, "The Key ID starts with rzp_live_ (copy it from Razorpay → Account & Settings → API Keys)."),
      keySecret: z.string().trim().max(200),
      webhookSecret: z.string().trim().max(200),
    })
    .safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0]?.message ?? "Check the form." };
  if (!keyAllowedHere(d.data.keyId)) return { ok: false, message: "This is a test key (rzp_test_…). The live site only accepts live keys (rzp_live_…), so customers are really charged." };

  const before = await db.setting.findUnique({ where: { key: SETTING_KEY } });
  const prev = (before?.value as { keyId?: string; keySecret?: string; webhookSecret?: string | null } | undefined) ?? {};
  const secret = d.data.keySecret || (prev.keyId === d.data.keyId && prev.keySecret ? decryptSecret(prev.keySecret) : null);
  if (!secret) return { ok: false, message: "Enter the Key Secret." };

  const check = await testCredentials(d.data.keyId, secret);
  if (!check.ok) return { ok: false, message: check.message };

  const value = {
    keyId: d.data.keyId,
    keySecret: encryptSecret(secret),
    webhookSecret: d.data.webhookSecret ? encryptSecret(d.data.webhookSecret) : (prev.webhookSecret ?? null),
    savedAt: new Date().toISOString(),
    savedBy: admin.email,
  };
  await db.setting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value }, update: { value } });
  // Never write secrets to the audit log.
  await audit(admin, "UPDATE", "Setting", SETTING_KEY, prev.keyId ? { keyId: prev.keyId } : undefined, { keyId: d.data.keyId, webhook: Boolean(value.webhookSecret) });
  forgetCachedCredentials();
  revalidatePath("/", "layout");
  return { ok: true, message: d.data.keyId.startsWith("rzp_live_") ? "Saved and checked with Razorpay. Online payment is live: customers are now charged for real." : "Saved and checked with Razorpay (test keys, this computer only)." };
}

/** Turns online payment off by removing the saved keys. */
export async function removeRazorpayKeys() {
  const admin = await requireAdmin("OWNER");
  const { SETTING_KEY, forgetCachedCredentials } = await import("@/features/payments/credentials");
  const before = await db.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!before) return { ok: true, message: "No keys were saved." };
  await db.setting.delete({ where: { key: SETTING_KEY } });
  await audit(admin, "DELETE", "Setting", SETTING_KEY, { keyId: (before.value as { keyId?: string }).keyId }, undefined);
  forgetCachedCredentials();
  revalidatePath("/", "layout");
  return { ok: true, message: "Keys removed. Checkout now offers cash on delivery and WhatsApp only." };
}
