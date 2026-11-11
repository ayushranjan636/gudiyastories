import "server-only";
import { db } from "@/server/db";

/** Start of the window, `days` ago (kept out of components so render stays pure). */
export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400_000);
}

/** Unpaid website checkouts from the last 7 days nobody has followed up yet (nav badge). */
export function countNewLeads() {
  return db.order.count({ where: { status: { in: ["PENDING_PAYMENT", "EXPIRED"] }, channel: "WEBSITE", leadStatus: null, createdAt: { gte: daysAgo(7) } } });
}
