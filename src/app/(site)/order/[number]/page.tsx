import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Printer } from "lucide-react";
import { getPublicOrder } from "@/features/orders/public";
import { OrderSummary } from "@/components/site/order-summary";
import { SuccessMark } from "./success-mark";
import { PendingRefresh } from "./pending-refresh";
import { formatINR } from "@/lib/money";
import { SITE, whatsappLink } from "@/config/site";
import { orderToken } from "@/features/orders/token";
import { hasWhatsAppApi } from "@/server/whatsapp";
import { hasEmail } from "@/server/email";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ placed?: string; verify?: string; t?: string }>;
}) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  let order = await getPublicOrder(number, undefined, sp.t);
  // Without the private link this page shows nothing, so an order number alone reveals no one's order.
  if (!order || !order.address) notFound();
  // Still unpaid? Ask Razorpay directly; no webhook needed.
  if ((order.status === "PENDING_PAYMENT" || order.status === "EXPIRED") && order.paymentMethod === "RAZORPAY") {
    const { reconcileOrderNumber } = await import("@/features/payments/reconcile");
    if ((await reconcileOrderNumber(number)) === "paid") order = (await getPublicOrder(number, undefined, sp.t))!;
  }
  const justPlaced = sp.placed === "1";
  const paidOnline = order.payment?.status === "CAPTURED" && order.paymentMethod !== "COD";
  const pending = order.status === "PENDING_PAYMENT";
  const receiptUrl = `/receipt/${order.number}?t=${orderToken(order.number)}`;
  const waText = `Hello Gudiya Stories, this is ${order.firstName}. My order ${order.number} (${formatINR(order.totalPaise)}) is ${
    paidOnline ? "paid" : order.paymentMethod === "COD" ? "placed for cash on delivery" : "placed"
  }. Receipt: ${SITE.url}${receiptUrl}`;

  return (
    <div className="content-grid pt-10 md:pt-16">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {justPlaced && !pending ? <SuccessMark /> : null}
          {pending ? <PendingRefresh /> : null}
          <p className="label-caps text-ink-soft">Order {order.number}</p>
          <h1 className="mt-3 text-h2">
            {pending ? "We're confirming your payment." : justPlaced ? `Thank you, ${order.firstName}.` : order.statusLabel}
          </h1>
          <p className="mt-4 max-w-[52ch] text-lead text-ink-soft">
            {pending
              ? "This usually takes a few seconds and this page updates by itself. If money left your account, the order confirms on its own; nothing is charged twice."
              : justPlaced
                ? "Your order is in. We pack it in Tirupati and send the tracking number when it ships."
                : "Here is everything about your order."}
          </p>
        </div>

        {/* Proof of purchase */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-line bg-white/70 p-6">
            <p className="label-caps text-leaf">{paidOnline ? "Payment received" : order.paymentMethod === "COD" ? "Cash on delivery" : "Order placed"}</p>
            <p className="mt-2 font-display text-h2 tabular-nums">{formatINR(paidOnline ? order.payment!.amountPaise : order.totalPaise)}</p>
            <dl className="mt-4 space-y-1.5 text-small">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Order number</dt>
                <dd className="font-mono">{order.number}</dd>
              </div>
              {order.payment?.gatewayPaymentId ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Payment ID</dt>
                  <dd className="truncate font-mono">{order.payment.gatewayPaymentId}</dd>
                </div>
              ) : null}
              {order.paidAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Paid on</dt>
                  <dd>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(order.paidAt)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <a href={receiptUrl} target="_blank" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-leaf text-small font-medium text-white hover:bg-leaf-deep">
                <Printer className="size-4" strokeWidth={1.5} aria-hidden="true" /> Receipt
              </a>
              <a
                href={whatsappLink(waText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/70 text-small font-medium hover:bg-paper-deep"
              >
                <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> Save on WhatsApp
              </a>
            </div>
            <p className="mt-4 text-small text-ink-soft">
              {order.contactEmail && hasEmail() ? `A copy of the receipt is on its way to ${order.contactEmail}. ` : ""}
              {hasWhatsAppApi() ? "We've also sent it to your WhatsApp. " : "Tap Save on WhatsApp to keep this order in a chat with us. "}
              Keep this page: its link is private to you.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <OrderSummary order={order} />
      </div>
      <p className="mt-12 text-small text-ink-soft">
        You can also check on it any time from{" "}
        <Link href="/track" className="underline underline-offset-4">
          Track an order
        </Link>{" "}
        with your order number and phone.
      </p>
    </div>
  );
}
