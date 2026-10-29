"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { setPopup } from "./actions";

/** On for one class at a time. Turning one on turns the others off. */
export function PopupSwitch({ id, on, disabled, title }: { id: string; on: boolean; disabled?: boolean; title: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Home-page pop-up for ${title}`}
        disabled={disabled || pending}
        title={disabled ? "Publish the class to use it as the pop-up" : undefined}
        onClick={() =>
          start(async () => {
            const r = await setPopup(id, !on);
            setMsg(r.ok ? null : r.message);
          })
        }
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          on ? "bg-leaf" : "bg-ink/20",
          pending && "opacity-60",
        )}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
      </button>
      {msg ? <span className="text-[0.75rem] text-clay">{msg}</span> : null}
    </div>
  );
}
