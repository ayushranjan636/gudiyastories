"use client";

import { useState, useTransition } from "react";
import { btn } from "@/components/admin/ui";
import { checkPaymentWithRazorpay, type ActionResult } from "../actions";

export function CheckPayment({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  return (
    <div className="mt-4">
      <button type="button" className={btn.secondary} disabled={pending} onClick={() => start(async () => setMsg(await checkPaymentWithRazorpay(id)))}>
        {pending ? "Checking…" : "Check payment with Razorpay"}
      </button>
      {msg ? <p role="status" className={`mt-2 text-small ${msg.ok ? "text-leaf" : "text-clay"}`}>{msg.message}</p> : null}
    </div>
  );
}
