import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Printer } from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, btn, Card, ORDER_TONE } from "@/components/admin/ui";
import { STATUS_LABEL } from "@/features/orders/public";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { OrderActions } from "./order-actions";
import { CheckPayment } from "./check-payment";
import { paymentMode } from "@/features/payments/gateway";

const time = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      shipments: { orderBy: { shippedAt: "desc" } },
      refunds: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, include: { adminUser: { select: { name: true } } } },
      customer: { include: { _count: { select: { orders: true } } } },
    },
  });
  if (!o) notFound();
  const payment = o.payments[0];
  const refunded = o.refunds.reduce((n, r) => n + r.amountPaise, 0);
  const statusMsg: Record<string, string> = {
    PAID: `Hello ${o.contactName.split(" ")[0]}, your Gudiya Stories order ${o.number} is confirmed. We'll send tracking details once it ships.`,
    PACKED: `Hello ${o.contactName.split(" ")[0]}, your order ${o.number} is packed and will ship shortly.`,
    SHIPPED: `Hello ${o.contactName.split(" ")[0]}, your order ${o.number} has shipped${o.shipments[0] ? ` with ${o.shipments[0].courier}, tracking ${o.shipments[0].trackingNumber}` : ""}.`,
    DELIVERED: `Hello ${o.contactName.split(" ")[0]}, we hope the books arrived safely. Thank you for ordering from Gudiya Stories.`,
  };
  const wa = `https://wa.me/${o.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(statusMsg[o.status] ?? `Hello ${o.contactName.split(" ")[0]}, about your order ${o.number}:`)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/orders" className="text-small text-ink-soft hover:text-ink">
            ← Orders
          </Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-h3">
            <span className="font-mono">{o.number}</span>
            <Badge tone={ORDER_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
          </h1>
          <p className="mt-1 text-small text-ink-soft">
            {time(o.createdAt)} · {o.channel.toLowerCase()} ·{" "}
            {o.paymentMethod === "COD" ? "cash on delivery" : o.paymentMethod === "RAZORPAY" ? "paid online" : "manual payment"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={wa} target="_blank" rel="noopener noreferrer" className={btn.secondary}>
            <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> WhatsApp customer
          </a>
          <a href={`/admin/print/order/${o.id}`} target="_blank" className={btn.secondary}>
            <Printer className="size-4" strokeWidth={1.5} aria-hidden="true" /> Packing slip and bill
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Items">
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-small text-ink-soft">
                      {i.sku} · {i.quantity} × {formatINR(i.unitPricePaise)}
                    </p>
                  </div>
                  <p className="tabular-nums">{formatINR(i.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-small">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatINR(o.subtotalPaise)}</dd></div>
              {o.discountPaise ? <div className="flex justify-between"><dt>Discount {o.couponCode ? `(${o.couponCode})` : ""}</dt><dd className="tabular-nums">-{formatINR(o.discountPaise)}</dd></div> : null}
              <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{o.shippingPaise ? formatINR(o.shippingPaise) : "Free"}</dd></div>
              {o.codFeePaise ? <div className="flex justify-between"><dt>COD fee</dt><dd className="tabular-nums">{formatINR(o.codFeePaise)}</dd></div> : null}
              <div className="flex justify-between pt-1 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatINR(o.totalPaise)}</dd></div>
              {refunded ? <div className="flex justify-between text-clay"><dt>Refunded</dt><dd className="tabular-nums">-{formatINR(refunded)}</dd></div> : null}
            </dl>
          </Card>

          <OrderActions
            id={o.id}
            status={o.status}
            paymentMethod={o.paymentMethod}
            canRefund={admin.role === "OWNER" && Boolean(payment && (payment.status === "CAPTURED" || payment.status === "PARTIALLY_REFUNDED"))}
            refundableRupees={payment ? (payment.amountPaise - refunded) / 100 : 0}
            note={o.internalNotes ?? ""}
          />

          <Card title="Timeline">
            <ol className="space-y-3">
              {o.events.map((e) => (
                <li key={e.id} className="grid grid-cols-[9.5rem_1fr] gap-3 text-small">
                  <span className="text-ink-soft">{time(e.createdAt)}</span>
                  <span>
                    {e.message}
                    {e.adminUser ? <span className="text-ink-soft"> · {e.adminUser.name}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-medium">{o.contactName}</p>
            <p className="text-small"><a href={`tel:${o.contactPhone}`} className="underline">{o.contactPhone}</a></p>
            {o.contactEmail ? <p className="text-small break-all"><a href={`mailto:${o.contactEmail}`} className="underline">{o.contactEmail}</a></p> : null}
            {o.customer ? (
              <p className="mt-2 text-small text-ink-soft">
                {o.customer._count.orders} {o.customer._count.orders === 1 ? "order" : "orders"} in total ·{" "}
                <Link href={`/admin/customers/${o.customer.id}`} className="underline">profile</Link>
              </p>
            ) : null}
          </Card>
          <Card title="Ship to">
            <address className="text-small not-italic leading-relaxed">
              {o.shipName}<br />
              {o.shipLine1}<br />
              {o.shipLine2 ? <>{o.shipLine2}<br /></> : null}
              {o.shipLandmark ? <>Near {o.shipLandmark}<br /></> : null}
              {o.shipCity}, {o.shipState} {o.shipPinCode}<br />
              {o.shipPhone}
            </address>
            {o.customerNote ? <p className="mt-3 rounded-lg bg-[#F2B91E]/20 p-3 text-small">Note: {o.customerNote}</p> : null}
          </Card>
          <Card title="Payment">
            {payment ? (
              <dl className="space-y-1 text-small">
                <div className="flex justify-between"><dt className="text-ink-soft">Status</dt><dd>{payment.status.toLowerCase().replace("_", " ")}</dd></div>
                {payment.instrument ? <div className="flex justify-between"><dt className="text-ink-soft">Method</dt><dd>{payment.instrument}</dd></div> : null}
                {payment.razorpayPaymentId ? <div className="flex justify-between gap-2"><dt className="text-ink-soft">Razorpay</dt><dd className="truncate font-mono">{payment.razorpayPaymentId}</dd></div> : null}
                {payment.capturedAt ? <div className="flex justify-between"><dt className="text-ink-soft">Received</dt><dd>{formatDate(payment.capturedAt)}</dd></div> : null}
              </dl>
            ) : (
              <p className="text-small text-ink-soft">No payment record.</p>
            )}
            {payment?.razorpayOrderId && (await paymentMode()) === "razorpay" && (o.status === "PENDING_PAYMENT" || o.status === "EXPIRED") ? (
              <CheckPayment id={o.id} />
            ) : null}
          </Card>
          {o.shipments.length ? (
            <Card title="Shipment">
              {o.shipments.map((s) => (
                <p key={s.id} className="text-small">
                  {s.courier} · <span className="font-mono">{s.trackingNumber}</span>
                  {s.trackingUrl ? <> · <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">track</a></> : null}
                </p>
              ))}
            </Card>
          ) : null}
          {o.utmSource ? (
            <Card title="Came from">
              <p className="text-small">{[o.utmSource, o.utmMedium, o.utmCampaign].filter(Boolean).join(" / ")}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
