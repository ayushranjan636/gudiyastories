"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { btn } from "@/components/admin/ui";
import { setProductsStatus } from "./actions";

export function BulkStatus({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const act = (status: "ACTIVE" | "DRAFT" | "ARCHIVED") =>
    start(async () => {
      const ids = new FormData(ref.current!).getAll("ids").map(String);
      if (!ids.length) return setMsg("Tick at least one product first.");
      const r = await setProductsStatus(ids, status);
      setMsg(r.message);
    });
  return (
    <form ref={ref} onSubmit={(e) => e.preventDefault()} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-small">
        <span className="text-ink-soft">With selected:</span>
        <button type="button" className={btn.quiet} disabled={pending} onClick={() => act("ACTIVE")}>Publish</button>
        <button type="button" className={btn.quiet} disabled={pending} onClick={() => act("DRAFT")}>Unpublish</button>
        <button type="button" className={btn.quiet} disabled={pending} onClick={() => act("ARCHIVED")}>Archive</button>
        {msg ? <span role="status" className="text-ink-soft">{msg}</span> : null}
      </div>
      {children}
    </form>
  );
}
