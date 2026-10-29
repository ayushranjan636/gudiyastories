import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { hasDatabase } from "./env";

const memory = new Map<string, { count: number; resetAt: number }>();

export async function clientKey(scope: string) {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
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
  const existing = await db.rateLimit.findUnique({ where: { key } });
  if (!existing || existing.resetAt.getTime() < now) {
    await db.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: 1, resetAt } });
    return true;
  }
  const updated = await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return updated.count <= limit;
}
