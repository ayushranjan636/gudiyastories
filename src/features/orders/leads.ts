import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * One rule for the whole admin: an order is CONFIRMED once its payment is recorded
 * (online via Razorpay, or marked paid by staff for a manual order). Only those
 * appear under Orders, in exports and in customer totals. Everything else (waiting
 * for payment, payment failed, expired, or cancelled before paying) is a lead.
 */
export const CONFIRMED: Prisma.OrderWhereInput = { paidAt: { not: null } };
export const UNPAID_LEAD: Prisma.OrderWhereInput = { paidAt: null };

/** Start of the window, `days` ago (kept out of components so render stays pure). */
export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400_000);
}

/** Unpaid checkouts from the last 7 days nobody has followed up yet (nav badge). */
export function countNewLeads() {
  return db.order.count({ where: { ...UNPAID_LEAD, leadStatus: null, createdAt: { gte: daysAgo(7) } } });
}
