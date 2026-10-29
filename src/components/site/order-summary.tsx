import type { PublicOrder } from "@/features/orders/public";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const STEPS = ["PAID", "PACKED", "SHIPPED", "DELIVERED"] as const;
const STEP_LABEL = { PAID: "Confirmed", PACKED: "Packed", SHIPPED: "On its way", DELIVERED: "Delivered" };

export function OrderSummary({ order }: { order: PublicOrder }) {
  const reached = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {reached >= 0 ? (
          <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
            {STEPS.map((s, i) => (
              <li key={s} aria-current={i === reached ? "step" : undefined}>
                <div className={cn("h-1.5 rounded-full", i <= reached ? "bg-leaf" : "bg-line")} />
                <p className={cn("mt-2 text-small", i <= reached ? "font-medium" : "text-ink-soft")}>{STEP_LABEL[s]}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl bg-paper-deep px-4 py-3 font-medium">{order.statusLabel}</p>
        )}

        {order.shipment ? (
          <div className="mt-8 rounded-2xl border border-line p-5">
            <p className="label-caps text-ink-soft">Shipped with {order.shipment.courier}</p>
            <p className="mt-2 font-mono text-small">{order.shipment.trackingNumber}</p>
            {order.shipment.trackingUrl ? (
              <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4">
                Track with the courier
              </a>
            ) : null}
          </div>
        ) : null}

        <ol className="mt-8 border-l border-line pl-6">
          {order.events.map((e, i) => (
            <li key={i} className="relative pb-5">
              <span className="absolute top-1.5 -left-[1.86rem] size-2.5 rounded-full bg-leaf ring-4 ring-paper" />
              <p className="font-medium">{e.message}</p>
              <p className="text-small text-ink-soft">{formatDate(e.at)}</p>
            </li>
          ))}
        </ol>
        {order.address ? <p className="mt-2 text-small text-ink-soft">Delivering to {order.address}</p> : null}
      </div>

      <div className="lg:col-span-5">
        <div className="rounded-2xl bg-paper-deep p-6">
          <ul className="space-y-3">
            {order.items.map((i) => (
              <li key={i.title} className="flex justify-between gap-4 text-small">
                <span>
                  {i.quantity} × {i.title}
                </span>
                <span className="tabular-nums">{formatINR(i.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-small">
            {order.discountPaise ? (
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd>-{formatINR(order.discountPaise)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{order.shippingPaise ? formatINR(order.shippingPaise) : "Free"}</dd>
            </div>
            {order.codFeePaise ? (
              <div className="flex justify-between">
                <dt>Cash on delivery fee</dt>
                <dd>{formatINR(order.codFeePaise)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between pt-2 font-medium">
              <dt>Total</dt>
              <dd className="font-display text-h4">{formatINR(order.totalPaise)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-small text-ink-soft">{order.paymentMethod === "COD" ? "Pay in cash when it arrives." : "Paid online."}</p>
        </div>
      </div>
    </div>
  );
}
