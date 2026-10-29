"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 20,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const btn = cn(
    "grid place-items-center rounded-full text-ink transition-colors hover:bg-paper-deep disabled:opacity-40",
    size === "sm" ? "size-8" : "size-11",
  );
  return (
    <div
      role="group"
      aria-label={`Quantity of ${label}`}
      className={cn("inline-flex items-center rounded-full border border-line bg-white/60", size === "sm" ? "h-9" : "h-12")}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min}>
        <Minus className="size-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">One fewer</span>
      </button>
      <output aria-live="polite" className={cn("text-center tabular-nums", size === "sm" ? "w-7 text-small" : "w-9")}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max}>
        <Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">One more</span>
      </button>
    </div>
  );
}
