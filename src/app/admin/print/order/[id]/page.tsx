import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { getSetting } from "@/server/settings";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { SITE } from "@/config/site";
import { PrintButton } from "./print-button";

export const metadata = { title: "Packing slip", robots: { index: false } };

type Invoice = { documentType: string; gstin: string | null; hsnDefault: string; note: string };

export default async function PrintOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [o, inv, store] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { hsnCode: true } } } } } }),
    getSetting<Invoice>("invoice"),
    getSetting<{ address: string | null }>("store"),
  ]);
  if (!o) notFound();
  const docTitle = inv.documentType === "TAX_INVOICE" ? "Tax invoice" : "Bill of supply";

  const from = (
    <div className="text-[12px] leading-snug">
      <p className="font-semibold">Gudiya Stories</p>
      <p>{store.address ?? `${SITE.city}, ${SITE.region}`}</p>
      <p>{SITE.phoneDisplay} · {SITE.email}</p>
      {inv.gstin ? <p>GSTIN {inv.gstin}</p> : null}
    </div>
  );

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-ink print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>

      {/* Packing slip */}
      <section className="break-after-page">
        <div className="flex items-start justify-between">
          <Image src="/brand/gudiya-stories-lockup.png" alt="Gudiya Stories" width={940} height={745} className="w-28" />
          <div className="text-right">
            <p className="font-display text-[22px]">Packing slip</p>
            <p className="font-mono">{o.number}</p>
            <p className="text-[12px]">{formatDate(o.createdAt)}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-ink/30 p-4">
          <div>
            <p className="text-[11px] tracking-wider uppercase">Ship to</p>
            <p className="mt-1 text-[15px] leading-snug font-medium">
              {o.shipName}<br />
              {o.shipLine1}<br />
              {o.shipLine2 ? <>{o.shipLine2}<br /></> : null}
              {o.shipLandmark ? <>Near {o.shipLandmark}<br /></> : null}
              {o.shipCity}, {o.shipState} {o.shipPinCode}<br />
              Phone {o.shipPhone}
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-wider uppercase">From</p>
            <div className="mt-1">{from}</div>
            {o.paymentMethod === "COD" ? (
              <p className="mt-3 rounded border-2 border-ink px-2 py-1 text-center text-[14px] font-bold">CASH ON DELIVERY: {formatINR(o.totalPaise)}</p>
            ) : null}
          </div>
        </div>
        <table className="mt-6 w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink/40 text-left">
              <th className="py-2">✓</th>
              <th>Title</th>
              <th>SKU</th>
              <th className="text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-ink/15">
                <td className="py-2"><span className="inline-block size-4 border border-ink" /></td>
                <td>{i.title}</td>
                <td className="font-mono">{i.sku}</td>
                <td className="text-right">{i.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {o.customerNote ? <p className="mt-4 text-[13px]">Customer note: {o.customerNote}</p> : null}
        <p className="mt-8 text-[13px]">Thank you for reading with us. Every book was written and designed in Tirupati by {SITE.author}.</p>
      </section>

      {/* Bill */}
      <section className="mt-16 print:mt-0">
        <div className="flex items-start justify-between">
          {from}
          <div className="text-right">
            <p className="font-display text-[22px]">{docTitle}</p>
            <p className="font-mono text-[13px]">{o.number}</p>
            <p className="text-[12px]">Date {formatDate(o.paidAt ?? o.createdAt)}</p>
          </div>
        </div>
        <div className="mt-6 text-[12px]">
          <p className="text-[11px] tracking-wider uppercase">Billed to</p>
          <p>{o.contactName}, {o.shipCity}, {o.shipState} {o.shipPinCode}</p>
        </div>
        <table className="mt-4 w-full text-[12px]">
          <thead>
            <tr className="border-b border-ink/40 text-left">
              <th className="py-2">Item</th>
              <th>HSN</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-ink/15">
                <td className="py-2">{i.title}</td>
                <td>{i.product?.hsnCode ?? inv.hsnDefault ?? "4901"}</td>
                <td className="text-right">{i.quantity}</td>
                <td className="text-right">{formatINR(i.unitPricePaise)}</td>
                <td className="text-right">{formatINR(i.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 ml-auto w-64 space-y-1 text-[12px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotalPaise)}</dd></div>
          {o.discountPaise ? <div className="flex justify-between"><dt>Discount</dt><dd>-{formatINR(o.discountPaise)}</dd></div> : null}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{formatINR(o.shippingPaise)}</dd></div>
          {o.codFeePaise ? <div className="flex justify-between"><dt>COD fee</dt><dd>{formatINR(o.codFeePaise)}</dd></div> : null}
          <div className="flex justify-between border-t border-ink/40 pt-1 text-[14px] font-semibold"><dt>Total</dt><dd>{formatINR(o.totalPaise)}</dd></div>
        </dl>
        <p className="mt-6 text-[11px] text-ink-soft">
          {docTitle === "Bill of supply" ? "Printed books are supplied under a bill of supply. " : ""}
          {inv.note?.includes("CONFIRM") ? "[CONFIRM WITH CA before using this bill for real orders.]" : ""}
        </p>
      </section>
    </div>
  );
}
