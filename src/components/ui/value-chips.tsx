"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { EASE_PAGE } from "@/components/book/book-3d";

export type ValueChipOption = { slug: string; name: string };

type ValueChipsProps = {
  options: ValueChipOption[];
  selected: string | null;
  onChange: (slug: string | null) => void;
  allLabel?: string;
  label?: string;
  className?: string;
};

/**
 * Single-select value filter, keyboard operable (native radio buttons).
 * The selected pill slides between chips with a shared layout animation.
 */
export function ValueChips({ options, selected, onChange, allLabel = "All books", label = "Filter by value", className }: ValueChipsProps) {
  const reduceMotion = useReducedMotion();
  const all: (ValueChipOption & { value: string | null })[] = [
    { slug: "__all", name: allLabel, value: null },
    ...options.map((o) => ({ ...o, value: o.slug })),
  ];

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">{label}</legend>
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        {all.map((o) => {
          const active = selected === o.value;
          return (
            <label
              key={o.slug}
              className={cn(
                "relative inline-flex h-10 cursor-pointer items-center rounded-full border px-4 text-small font-medium select-none",
                "transition-colors duration-200 ease-page has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf",
                active ? "border-ink text-paper" : "border-line text-ink hover:border-ink/40",
              )}
            >
              <input
                type="radio"
                name="value-chip"
                className="sr-only"
                checked={active}
                onChange={() => onChange(o.value)}
              />
              {active ? (
                <motion.span
                  layoutId="value-chip-active"
                  aria-hidden="true"
                  className="absolute inset-0 -z-0 rounded-full bg-ink"
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: EASE_PAGE }}
                />
              ) : null}
              <span className="relative z-10">{o.name}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
