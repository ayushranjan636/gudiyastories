"use client";

import { useState, useTransition } from "react";
import { updateLead } from "./actions";

const OPTIONS = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["CONVERTED", "Converted"],
  ["LOST", "Not interested"],
] as const;

export function LeadControls({ orderId, status, note }: { orderId: string; status: string; note: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [value, setValue] = useState(status);
  const [text, setText] = useState(note);
  return (
    <form
      className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[10rem_1fr_auto] sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setMsg((await updateLead({ orderId, status: value as "NEW", note: text })).message));
      }}
    >
      <select value={value} onChange={(e) => setValue(e.target.value)} aria-label="Lead status" className="h-9 rounded-lg border border-line bg-white px-2 text-small">
        {OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Note, e.g. called, will pay tonight" aria-label="Note" className="h-9 rounded-lg border border-line bg-white px-3 text-small" />
      <button disabled={pending} className="h-9 rounded-lg bg-ink px-4 text-small font-medium text-paper disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      {msg ? <p role="status" className="text-small text-leaf sm:col-span-3">{msg}</p> : null}
    </form>
  );
}
