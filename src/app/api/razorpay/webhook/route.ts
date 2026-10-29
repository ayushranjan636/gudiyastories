import { createHmac, timingSafeEqual } from "node:crypto";
import { hasDatabase } from "@/server/env";

type RzpEvent = {
  event: string;
  payload?: {
    payment?: { entity?: { id: string; order_id: string; amount?: number; method?: string; status?: string } };
    refund?: { entity?: { id: string; payment_id: string; amount: number; status: string } };
  };
};

/**
 * Razorpay webhook (optional). The site confirms payments without it, by asking
 * Razorpay directly. To use it, add a webhook in the Razorpay dashboard and put
 * the same secret in Admin → Settings → Online payments (or RAZORPAY_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  if (!hasDatabase()) return new Response("Not configured", { status: 503 });
  const { getRazorpayCredentials } = await import("@/features/payments/credentials");
  const secret = (await getRazorpayCredentials())?.webhookSecret;
  if (!secret) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Bad signature", { status: 401 });

  const eventId = req.headers.get("x-razorpay-event-id");
  const evt = JSON.parse(raw) as RzpEvent;
  const { db } = await import("@/server/db");

  if (eventId) {
    const seen = await db.webhookEvent.findUnique({ where: { id: eventId } });
    if (seen) return new Response("Already processed", { status: 200 });
  }

  // Optional extra signal. The payment itself is still re-checked with Razorpay's
  // API, so the webhook and the no-webhook path confirm orders the same way.
  if (["payment.authorized", "payment.captured", "order.paid", "payment.failed"].includes(evt.event)) {
    const orderId = evt.payload?.payment?.entity?.order_id;
    const payment = orderId ? await db.payment.findUnique({ where: { razorpayOrderId: orderId }, select: { orderId: true } }) : null;
    if (payment) {
      const { reconcileOrder } = await import("@/features/payments/reconcile");
      await reconcileOrder(payment.orderId);
    }
  }

  if (evt.event === "refund.processed") {
    const r = evt.payload?.refund?.entity;
    if (r?.id) await db.refund.updateMany({ where: { razorpayRefundId: r.id }, data: { status: "PROCESSED" } });
  }

  if (eventId) await db.webhookEvent.create({ data: { id: eventId, type: evt.event } }).catch(() => {});
  return new Response("ok", { status: 200 });
}
