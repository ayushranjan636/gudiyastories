import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicOrder } from "@/features/orders/public";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { SITE } from "@/config/site";
import { getSetting } from "@/server/settings";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

const when = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

/** The customer's proof of purchase. Opens only with the private link from the confirmation page or email. */
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const o = await getPublicOrder(number, undefined, t);
  if (!o || !o.address) notFound();
  const store = await getSetting<{ address: string | null; gstin?: string | null }>("store");
  const paid = o.payment?.status === "CAPTURED" || o.payment?.status === "PARTIALLY_REFUNDED";

  return (
    <main className="min-h-dvh bg-paper-deep/50 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-[190mm]">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>
        <article className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-[0_30px_60px_-40px_rgb(27_26_23/0.5)] print:rounded-none print:shadow-none sm:p-12">
          {paid ? (
            <span aria-hidden="true" className="absolute top-10 right-8 rotate-[-10deg] rounded-lg border-4 border-leaf/70 px-3 py-1 font-display text-2xl tracking-wide text-leaf/80 uppercase">
              Paid
            </span>
          ) : null}
          <header className="flex items-start gap-5">
            <Image src="/brand/gudiya-stories-lockup.png" alt="Gudiya Stories" width={940} height={745} className="w-24" />
            <div>
              <h1 className="font-display text-h3">Receipt</h1>
              <p className="text-small text-ink-soft">
                Gudiya Stories · {store.address ?? `${SITE.city}, ${SITE.region}`}
                <br />
                {SITE.phoneDisplay} · {SITE.email}
              </p>
            </div>
          </header>

          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-3 text-small sm:grid-cols-4">
            <div>
              <dt className="text-ink-soft">Order</dt>
              <dd className="font-mono font-medium">{o.number}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Date</dt>
              <dd>{formatDate(o.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Payment</dt>
              <dd>{o.paymentMethod === "COD" ? (paid ? "Cash on delivery, received" : "Cash on delivery") : o.paymentMethod === "RAZORPAY" ? `Online${o.payment?.instrument ? ` (${o.payment.instrument})` : ""}` : "Manual"}</dd>
            </div>
            {o.payment?.gatewayPaymentId ? (
              <div>
                <dt className="text-ink-soft">Payment ID</dt>
                <dd className="font-mono break-all">{o.payment.gatewayPaymentId}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-8 text-small">
            <p className="text-ink-soft">Billed and shipped to</p>
            <p className="mt-1">{o.address}</p>
          </div>

          <table className="mt-8 w-full text-small">
            <thead>
              <tr className="border-b border-ink/30 text-left text-ink-soft">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.title} className="border-b border-line">
                  <td className="py-2.5">{i.title}</td>
                  <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatINR(i.lineTotalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-small">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatINR(o.subtotalPaise)}</dd></div>
            {o.discountPaise ? <div className="flex justify-between"><dt>Discount</dt><dd className="tabular-nums">-{formatINR(o.discountPaise)}</dd></div> : null}
            <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{o.shippingPaise ? formatINR(o.shippingPaise) : "Free"}</dd></div>
            {o.codFeePaise ? <div className="flex justify-between"><dt>Cash on delivery fee</dt><dd className="tabular-nums">{formatINR(o.codFeePaise)}</dd></div> : null}
            <div className="flex justify-between border-t border-ink/30 pt-2 text-body font-semibold"><dt>Total {paid ? "paid" : ""}</dt><dd className="tabular-nums">{formatINR(o.totalPaise)}</dd></div>
          </dl>

          {o.paidAt ? <p className="mt-8 text-small text-ink-soft">Payment received {when(o.paidAt)}.</p> : null}
          <p className="mt-2 text-small text-ink-soft">Prices include all taxes. Thank you for reading with us.</p>
        </article>
      </div>
    </main>
  );
}
