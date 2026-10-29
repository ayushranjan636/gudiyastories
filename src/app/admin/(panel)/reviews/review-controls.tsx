"use client";

import { useState, useTransition } from "react";
import { btn, inputCls } from "@/components/admin/ui";
import { moderateReview } from "./actions";

export function ReviewControls({ id, status, reply }: { id: string; status: string; reply: string }) {
  const [text, setText] = useState(reply);
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 space-y-2 border-t border-line pt-4">
      <textarea aria-label="Public reply" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply in public (optional)" className={`${inputCls} h-auto py-2`} />
      <div className="flex flex-wrap gap-2">
        {status !== "APPROVED" ? <button className={btn.primary} disabled={pending} onClick={() => start(() => moderateReview(id, "APPROVED", text))}>Approve</button> : <button className={btn.secondary} disabled={pending} onClick={() => start(() => moderateReview(id, "APPROVED", text))}>Save reply</button>}
        {status !== "HIDDEN" ? <button className={btn.quiet} disabled={pending} onClick={() => start(() => moderateReview(id, "HIDDEN", text))}>Hide</button> : null}
      </div>
    </div>
  );
}
