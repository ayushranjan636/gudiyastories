"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { createManualOrder } from "../actions";

type P = { slug: string; title: string; priceRupees: number };

export function ManualOrderForm({ products }: { products: P[] }) {
  const [lines, setLines] = useState([{ slug: products[0]?.slug ?? "", quantity: 1, unitRupees: products[0]?.priceRupees ?? 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const subtotal = lines.reduce((n, l) => n + l.quantity * l.unitRupees, 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const r = await createManualOrder({
            channel: String(f.get("channel")) as "WHATSAPP",
            paid: f.get("paid") === "on",
            name: String(f.get("name")),
            phone: String(f.get("phone")).replace(/\s/g, ""),
            email: String(f.get("email") ?? ""),
            line1: String(f.get("line1")),
            city: String(f.get("city")),
            state: String(f.get("state")),
            pinCode: String(f.get("pin")),
            shippingRupees: Number(f.get("shipping") || 0),
            discountRupees: Number(f.get("discount") || 0),
            note: String(f.get("note") ?? ""),
            lines,
          });
          if (r && !r.ok) setError(r.message);
        });
      }}
      className="grid gap-6 xl:grid-cols-3"
    >
      <div className="space-y-6 xl:col-span-2">
        <Card title="Books">
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
                <label className={labelCls}>
                  <span className={i ? "sr-only" : ""}>Book</span>
                  <select
                    className={inputCls}
                    value={l.slug}
                    onChange={(e) => {
                      const p = products.find((x) => x.slug === e.target.value);
                      setLines(lines.map((x, j) => (j === i ? { ...x, slug: e.target.value, unitRupees: p?.priceRupees ?? x.unitRupees } : x)));
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  <span className={i ? "sr-only" : ""}>Qty</span>
                  <input type="number" min={1} className={inputCls} value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x)))} />
                </label>
                <label className={labelCls}>
                  <span className={i ? "sr-only" : ""}>Price each ₹</span>
                  <input type="number" min={0} step="0.01" className={inputCls} value={l.unitRupees} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitRupees: Number(e.target.value) } : x)))} />
                </label>
                <button type="button" className={btn.quiet} onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}>
                  <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
                  <span className="sr-only">Remove line</span>
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={`${btn.quiet} mt-3`} onClick={() => setLines([...lines, { slug: products[0]!.slug, quantity: 1, unitRupees: products[0]!.priceRupees }])}>
            <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" /> Add a book
          </button>
          <p className="mt-4 text-right text-small">
            Books subtotal <span className="font-semibold tabular-nums">₹{subtotal.toLocaleString("en-IN")}</span>
          </p>
        </Card>
        <Card title="Customer and delivery">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>Name<input name="name" required className={inputCls} /></label>
            <label className={labelCls}>Mobile<input name="phone" required className={inputCls} /></label>
            <label className={`${labelCls} sm:col-span-2`}>Email (optional)<input name="email" type="email" className={inputCls} /></label>
            <label className={`${labelCls} sm:col-span-2`}>Address<input name="line1" required className={inputCls} /></label>
            <label className={labelCls}>City<input name="city" required className={inputCls} /></label>
            <label className={labelCls}>State<input name="state" required className={inputCls} /></label>
            <label className={labelCls}>PIN code<input name="pin" required className={inputCls} /></label>
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <Card title="Order">
          <div className="space-y-3">
            <label className={labelCls}>
              Channel
              <select name="channel" className={inputCls} defaultValue="WHATSAPP">
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PHONE">Phone</option>
                <option value="BULK">Bulk / school</option>
                <option value="OFFLINE">Offline / book fair</option>
                <option value="AMAZON">Amazon</option>
                <option value="FLIPKART">Flipkart</option>
              </select>
            </label>
            <label className={labelCls}>Delivery charge ₹<input name="shipping" type="number" min={0} defaultValue={0} className={inputCls} /></label>
            <label className={labelCls}>Discount ₹<input name="discount" type="number" min={0} defaultValue={0} className={inputCls} /></label>
            <label className={labelCls}>Internal note<textarea name="note" rows={2} className={`${inputCls} h-auto py-2`} /></label>
            <label className="flex items-center gap-2 text-small">
              <input type="checkbox" name="paid" className="size-4 accent-leaf" /> Already paid (deduct stock now)
            </label>
          </div>
          {error ? <p role="alert" className="mt-3 text-small text-clay">{error}</p> : null}
          <button className={`${btn.primary} mt-5 w-full`} disabled={pending}>
            {pending ? "Creating…" : "Create order"}
          </button>
        </Card>
      </div>
    </form>
  );
}
