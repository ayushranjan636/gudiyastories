import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { hasDatabase } from "./env";

const memory = new Map<string, { count: number; resetAt: number }>();

/**
 * The visitor's real IP. On Netlify only its own header is trusted; anything a
 * visitor sends themselves (like a made-up X-Forwarded-For) would let them dodge
 * rate limits. Elsewhere the reverse proxy in front of the site sets X-Real-IP.
 */
export function clientIp(h: Headers) {
  if (process.env.NETLIFY) return h.get("x-nf-client-connection-ip") || "unknown";
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}

export async function clientKey(scope: string) {
  const ip = clientIp(await headers());
  return `${scope}:${createHash("sha256").update(ip).digest("hex").slice(0, 24)}`;
}

/** Fixed-window limiter. Uses the RateLimit table when a database exists, memory otherwise. */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  if (!hasDatabase()) {
    const b = memory.get(key);
    if (!b || b.resetAt < now) {
      memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }
    b.count += 1;
    return b.count <= limit;
  }
  const { db } = await import("./db");
  const resetAt = new Date(now + windowSeconds * 1000);
  // One atomic statement, so a burst of parallel requests can't slip past the limit:
  // start a new window if the old one ran out, otherwise count one more.
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 1) <= limit;
}
