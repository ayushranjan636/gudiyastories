"use client";

import { useState, useTransition } from "react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { importStockCount, recordMovement, type MoveResult } from "./actions";

const TYPES = [
  { v: "RESTOCK", l: "Restock (new copies arrived)" },
  { v: "SALE_MARKETPLACE", l: "Sold on Amazon or Flipkart" },
  { v: "SALE_OFFLINE", l: "Sold offline or at a book fair" },
  { v: "RETURN", l: "Returned to stock" },
  { v: "DAMAGED", l: "Damaged or lost" },
  { v: "ADJUSTMENT", l: "Correction (+ or −)" },
] as const;

export function MovementForm({ books }: { books: { id: string; title: string; available: number }[] }) {
  const [type, setType] = useState<(typeof TYPES)[number]["v"]>("RESTOCK");
  const [res, setRes] = useState<MoveResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card title="Record a change">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          start(async () => {
            const r = await recordMovement({
              productId: String(f.get("productId")),
              type,
              quantity: Number(f.get("quantity")),
              channel: (f.get("channel") || undefined) as "AMAZON" | undefined,
              note: String(f.get("note") ?? ""),
            });
            setRes(r);
            if (r.ok) (form.elements.namedItem("quantity") as HTMLInputElement).value = "";
          });
        }}
      >
        <label className={labelCls}>
          What happened
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as "RESTOCK")}>
            {TYPES.map((t) => (
              <option key={t.v} value={t.v}>{t.l}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Book
          <select name="productId" className={inputCls}>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title} ({b.available} available)</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            {type === "ADJUSTMENT" ? "Change (+/−)" : "Copies"}
            <input name="quantity" type="number" required min={type === "ADJUSTMENT" ? undefined : 1} className={inputCls} />
          </label>
          {type === "SALE_MARKETPLACE" ? (
            <label className={labelCls}>
              Where
              <select name="channel" className={inputCls}>
                <option value="AMAZON">Amazon</option>
                <option value="FLIPKART">Flipkart</option>
              </select>
            </label>
          ) : type === "SALE_OFFLINE" ? (
            <label className={labelCls}>
              Where
              <select name="channel" className={inputCls}>
                <option value="OFFLINE">Book fair / in person</option>
                <option value="BULK">School / bulk</option>
              </select>
            </label>
          ) : null}
        </div>
        <label className={labelCls}>
          Note <span className="font-normal text-ink-soft">(optional)</span>
          <input name="note" className={inputCls} placeholder={type === "RESTOCK" ? "Printer invoice no." : "Order ID, event name…"} />
        </label>
        {res ? <p role="status" className={`rounded-lg px-3 py-2 text-small ${res.ok ? "bg-leaf/10 text-leaf" : "bg-clay/10 text-clay"}`}>{res.message}</p> : null}
        <button className={`${btn.primary} w-full`} disabled={pending}>{pending ? "Saving…" : "Record"}</button>
      </form>
    </Card>
  );
}

export function StockImport() {
  const [res, setRes] = useState<MoveResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Import a stock count">
      <p className="text-small text-ink-soft">
        Counted the shelf? Upload a CSV with columns <code>sku</code> and <code>count</code>. We add one correction per book so the ledger matches your count.
      </p>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => setRes(await importStockCount(f)));
        }}
      >
        <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-small" />
        <button className={btn.secondary} disabled={pending}>{pending ? "Importing…" : "Import"}</button>
        {res ? <p role="status" className={`text-small ${res.ok ? "text-leaf" : "text-clay"}`}>{res.message}</p> : null}
      </form>
    </Card>
  );
}
