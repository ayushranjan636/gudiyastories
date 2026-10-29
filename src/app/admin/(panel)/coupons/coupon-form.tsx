"use client";

import { useState, useTransition } from "react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { createCoupon, toggleCoupon } from "./actions";

export function CouponForm({ values }: { values: { slug: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [type, setType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  return (
    <Card title="New code">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          const opt = (k: string) => (f.get(k) ? String(f.get(k)) : undefined);
          start(async () => {
            const r = await createCoupon({
              code: String(f.get("code")),
              description: opt("description"),
              type,
              amount: Number(f.get("amount")),
              minOrderRupees: opt("min") ? Number(opt("min")) : undefined,
              endsAt: opt("ends"),
              usageLimitTotal: opt("limit") ? Number(opt("limit")) : undefined,
              usageLimitPerCustomer: opt("perCustomer") ? Number(opt("perCustomer")) : undefined,
              firstOrderOnly: f.get("first") === "on",
              values: f.getAll("values").map(String),
            });
            setMsg(r);
            if (r.ok) form.reset();
          });
        }}
      >
        <label className={labelCls}>Code<input name="code" required className={`${inputCls} uppercase`} placeholder="CHILDRENSDAY" /></label>
        <label className={labelCls}>What it&apos;s for<input name="description" className={inputCls} placeholder="Children's Day 2026" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            Type
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as "FIXED")}>
              <option value="PERCENTAGE">Percent off</option>
              <option value="FIXED">Rupees off</option>
            </select>
          </label>
          <label className={labelCls}>{type === "PERCENTAGE" ? "Percent" : "Rupees"}<input name="amount" type="number" min={1} required className={inputCls} /></label>
          <label className={labelCls}>Minimum order ₹<input name="min" type="number" min={0} className={inputCls} /></label>
          <label className={labelCls}>Ends on<input name="ends" type="date" className={inputCls} /></label>
          <label className={labelCls}>Total uses<input name="limit" type="number" min={1} className={inputCls} /></label>
          <label className={labelCls}>Uses per customer<input name="perCustomer" type="number" min={1} className={inputCls} /></label>
        </div>
        <fieldset>
          <legend className="text-small font-medium">Only for books carrying <span className="font-normal text-ink-soft">(optional)</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {values.map((v) => (
              <label key={v.slug} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-small has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper">
                <input type="checkbox" name="values" value={v.slug} className="sr-only" />
                {v.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-small"><input type="checkbox" name="first" className="size-4 accent-leaf" /> First order only</label>
        {msg ? <p role="status" className={`text-small ${msg.ok ? "text-leaf" : "text-clay"}`}>{msg.message}</p> : null}
        <button className={`${btn.primary} w-full`} disabled={pending}>{pending ? "Creating…" : "Create code"}</button>
      </form>
    </Card>
  );
}

export function ToggleCoupon({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className="ml-2 text-small underline" onClick={() => start(() => toggleCoupon(id, !active))}>
      {active ? "Turn off" : "Turn on"}
    </button>
  );
}
