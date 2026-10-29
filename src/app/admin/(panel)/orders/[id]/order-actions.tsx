"use client";

import { useState, useTransition } from "react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { cancelOrder, markDelivered, markManualPaid, markPacked, markShipped, refundOrder, saveNote, type ActionResult } from "../actions";

const COURIERS = ["India Post", "DTDC", "Delhivery", "Blue Dart", "Professional Couriers", "Shiprocket", "Other"];

export function OrderActions({
  id,
  status,
  paymentMethod,
  canRefund,
  refundableRupees,
  note,
}: {
  id: string;
  status: string;
  paymentMethod: string;
  canRefund: boolean;
  refundableRupees: number;
  note: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [panel, setPanel] = useState<"ship" | "cancel" | "refund" | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setMsg(r);
      if (r.ok) setPanel(null);
    });

  return (
    <Card title="Next step">
      {msg ? (
        <p role="status" className={`mb-4 rounded-lg px-3 py-2 text-small ${msg.ok ? "bg-leaf/10 text-leaf" : "bg-clay/10 text-clay"}`}>
          {msg.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(status === "PENDING_PAYMENT" || status === "EXPIRED") && paymentMethod === "MANUAL" ? (
          <button className={btn.primary} disabled={pending} onClick={() => run(() => markManualPaid(id))}>
            Record payment
          </button>
        ) : null}
        {status === "PAID" ? (
          <button className={btn.primary} disabled={pending} onClick={() => run(() => markPacked(id))}>
            Mark packed
          </button>
        ) : null}
        {status === "PAID" || status === "PACKED" ? (
          <button className={status === "PACKED" ? btn.primary : btn.secondary} disabled={pending} onClick={() => setPanel(panel === "ship" ? null : "ship")}>
            Add tracking and ship
          </button>
        ) : null}
        {status === "SHIPPED" ? (
          <button className={btn.primary} disabled={pending} onClick={() => run(() => markDelivered(id))}>
            Mark delivered
          </button>
        ) : null}
        {["PENDING_PAYMENT", "PAID", "PACKED", "EXPIRED"].includes(status) ? (
          <button className={btn.danger} disabled={pending} onClick={() => setPanel(panel === "cancel" ? null : "cancel")}>
            Cancel order
          </button>
        ) : null}
        {canRefund ? (
          <button className={btn.danger} disabled={pending} onClick={() => setPanel(panel === "refund" ? null : "refund")}>
            Refund
          </button>
        ) : null}
      </div>

      {panel === "ship" ? (
        <form
          className="mt-5 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => markShipped(id, { courier: String(f.get("courier")), trackingNumber: String(f.get("tracking")), trackingUrl: String(f.get("url") ?? "") }));
          }}
        >
          <label className={labelCls}>
            Courier
            <input name="courier" list="couriers" required className={inputCls} />
            <datalist id="couriers">
              {COURIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className={labelCls}>
            Tracking number
            <input name="tracking" required className={inputCls} />
          </label>
          <label className={labelCls}>
            Tracking link <span className="font-normal text-ink-soft">(optional)</span>
            <input name="url" type="url" className={inputCls} />
          </label>
          <div className="sm:col-span-3">
            <button className={btn.primary} disabled={pending}>
              Mark shipped and email the customer
            </button>
          </div>
        </form>
      ) : null}

      {panel === "cancel" ? (
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => cancelOrder(id, f.get("restock") === "on", String(f.get("reason") ?? "")));
          }}
        >
          <label className={labelCls}>
            Reason <span className="font-normal text-ink-soft">(for the timeline)</span>
            <input name="reason" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-small">
            <input type="checkbox" name="restock" defaultChecked className="size-4 accent-leaf" /> Put the books back into stock
          </label>
          <button className={btn.danger} disabled={pending}>
            Confirm cancellation
          </button>
        </form>
      ) : null}

      {panel === "refund" ? (
        <form
          className="mt-5 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => refundOrder(id, Number(f.get("amount")), f.get("restock") === "on", String(f.get("reason") ?? "")));
          }}
        >
          <label className={labelCls}>
            Amount (₹) <span className="font-normal text-ink-soft">up to {refundableRupees}</span>
            <input name="amount" type="number" step="0.01" min="1" max={refundableRupees} defaultValue={refundableRupees} required className={inputCls} />
          </label>
          <label className={labelCls}>
            Reason
            <input name="reason" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-small sm:col-span-2">
            <input type="checkbox" name="restock" className="size-4 accent-leaf" /> The books came back; put them into stock
          </label>
          <div className="sm:col-span-2">
            <button className={btn.danger} disabled={pending}>
              Send refund
            </button>
          </div>
        </form>
      ) : null}

      <form
        className="mt-6 border-t border-line pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() => saveNote(id, String(f.get("note") ?? "")));
        }}
      >
        <label className={labelCls}>
          Internal note <span className="font-normal text-ink-soft">(only staff see this)</span>
          <textarea name="note" defaultValue={note} rows={3} className={`${inputCls} h-auto py-2`} />
        </label>
        <button className={`${btn.quiet} mt-2`} disabled={pending}>
          Save note
        </button>
      </form>
    </Card>
  );
}
