import "server-only";
import { db } from "@/server/db";
import { confirmOrder } from "@/features/orders/service";
import { paymentMode, settleOrder, settlePayment, type Settlement } from "./gateway";

/**
 * How a payment becomes "paid", with or without webhooks:
 *
 *  1. Right after checkout, the browser sends the payment ID and signature.
 *     We check the signature, then ask Razorpay for the payment itself
 *     (amount, currency, order, status) before confirming.          → applySettlement
 *  2. If the browser never reports back (tab closed, phone lost signal), the
 *     order page and a background sweep every two minutes ask Razorpay for
 *     every attempt on that order.                                   → reconcilePending
 *  3. Webhooks, if you set one up later, feed the same function.
 *
 * Every path ends in confirmOrder(), which is safe to call more than once.
 */

type PaymentRow = { id: string; orderId: string; amountPaise: number; razorpayOrderId: string | null; status: string };

export async function applySettlement(payment: PaymentRow, s: Settlement, signature?: string) {
  if (s.state === "captured") {
    await confirmOrder(payment.orderId, {
      razorpayPaymentId: s.paymentId,
      razorpaySignature: signature,
      instrument: s.instrument,
      raw: s.raw as never,
    });
    return "paid" as const;
  }
  if (s.state === "mismatch") {
    const already = await db.orderEvent.findFirst({ where: { orderId: payment.orderId, message: s.reason }, select: { id: true } });
    if (!already) await db.orderEvent.create({ data: { orderId: payment.orderId, message: `${s.reason} Not confirmed; check it in the Razorpay dashboard.` } });
    return "mismatch" as const;
  }
  if (s.state === "failed" && payment.status === "CREATED") {
    // The customer can still retry in the same Razorpay window, so the order stays open.
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } }).catch(() => {});
    return "failed" as const;
  }
  return "pending" as const;
}

/** Checks one order with Razorpay. Used by the order page and the admin's "Check payment" button. */
export async function reconcileOrder(orderId: string) {
  if ((await paymentMode()) !== "razorpay") return "pending" as const;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const p = order?.payments[0];
  if (!order || !p?.razorpayOrderId || !["PENDING_PAYMENT", "EXPIRED"].includes(order.status)) return "pending" as const;
  const s = await settleOrder(p.razorpayOrderId, p.amountPaise);
  return applySettlement(p, s);
}

/** Confirms a payment the browser just reported (after its signature checked out). */
export async function settleReportedPayment(gatewayOrderId: string, paymentId: string, signature: string) {
  const p = await db.payment.findUnique({ where: { razorpayOrderId: gatewayOrderId } });
  if (!p) return { state: "unknown" as const, payment: null };
  const s = await settlePayment(paymentId, gatewayOrderId, p.amountPaise);
  return { state: await applySettlement(p, s, signature), payment: p };
}

let running = false;

/**
 * The sweep: every open Razorpay order from the last two days is checked with
 * Razorpay, then orders still unpaid past their deadline are marked expired.
 * Expiring always happens *after* the check, so a paid order is never expired.
 */
/** budgetMs: stop checking after this long (serverless functions have a time limit); the rest waits for the next run. */
export async function reconcilePending(opts: { maxAgeHours?: number; budgetMs?: number } = {}) {
  const started = Date.now();
  if (running) return { checked: 0, paid: 0, expired: 0, skipped: true };
  running = true;
  try {
    let checked = 0;
    let paid = 0;
    if ((await paymentMode()) === "razorpay") {
      const since = new Date(Date.now() - (opts.maxAgeHours ?? 48) * 3600_000);
      const open = await db.payment.findMany({
        where: {
          method: "RAZORPAY",
          status: { in: ["CREATED", "FAILED", "AUTHORIZED"] },
          razorpayOrderId: { not: null, startsWith: "order_" },
          createdAt: { gte: since },
          order: { status: { in: ["PENDING_PAYMENT", "EXPIRED"] } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      for (const p of open) {
        if (opts.budgetMs && Date.now() - started > opts.budgetMs) break;
        try {
          checked++;
          if ((await applySettlement(p, await settleOrder(p.razorpayOrderId!, p.amountPaise))) === "paid") paid++;
        } catch (err) {
          console.error("[payments] could not check", p.razorpayOrderId, err instanceof Error ? err.message : err);
        }
      }
    }
    const expired = await db.order.updateMany({
      where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return { checked, paid, expired: expired.count, skipped: false };
  } finally {
    running = false;
  }
}

/** Same as reconcileOrder, by order number, at most once every few seconds per order. */
export async function reconcileOrderNumber(number: string) {
  if ((await paymentMode()) !== "razorpay") return "pending" as const;
  const { rateLimit } = await import("@/server/rate-limit");
  if (!(await rateLimit(`reconcile:${number}`, 1, 5))) return "pending" as const;
  const o = await db.order.findUnique({ where: { number }, select: { id: true } });
  if (!o) return "pending" as const;
  try {
    return await reconcileOrder(o.id);
  } catch (err) {
    console.error("[payments] check", number, err instanceof Error ? err.message : err);
    return "pending" as const;
  }
}
