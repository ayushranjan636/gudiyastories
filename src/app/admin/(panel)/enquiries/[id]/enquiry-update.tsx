"use client";

import { useState, useTransition } from "react";
import { btn, Card, inputCls, labelCls } from "@/components/admin/ui";
import { updateEnquiry } from "../actions";

const STAGES = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["SAMPLE_SENT", "Sample sent"],
  ["QUOTED", "Quoted"],
  ["WON", "Won"],
  ["LOST", "Lost"],
] as const;

export function EnquiryUpdate({ id, stage, followUp }: { id: string; stage: string; followUp: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Card title="Progress">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          start(async () => {
            const r = await updateEnquiry(id, { stage: String(f.get("stage")), nextFollowUpOn: String(f.get("follow") ?? ""), note: String(f.get("note") ?? "") });
            setMsg(r.message);
            (form.elements.namedItem("note") as HTMLTextAreaElement).value = "";
          });
        }}
      >
        <label className={labelCls}>
          Stage
          <select name="stage" defaultValue={stage} className={inputCls}>
            {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className={labelCls}>
          Follow up on
          <input type="date" name="follow" defaultValue={followUp} className={inputCls} />
          <span className="font-normal text-ink-soft">You&apos;ll get an email reminder that morning.</span>
        </label>
        <label className={labelCls}>
          Add a note
          <textarea name="note" rows={3} className={`${inputCls} h-auto py-2`} placeholder="Called the principal; wants 60 copies before Children's Day." />
        </label>
        <button className={`${btn.primary} w-full`} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {msg ? <p role="status" className="text-small text-leaf">{msg}</p> : null}
      </form>
    </Card>
  );
}
