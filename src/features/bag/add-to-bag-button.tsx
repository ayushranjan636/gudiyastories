"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useBag } from "./bag-context";
import { cn } from "@/lib/cn";
import { EASE } from "@/components/motion/reveal";

type Props = {
  slug: string;
  title?: string;
  /** id of the element the flying cover starts from (usually the cover image). */
  sourceId?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  /** Upper limit, e.g. stock available. */
  max?: number;
};

const HEIGHT = { sm: "h-9", md: "h-12", lg: "h-14" };
const TEXT = { sm: "text-small", md: "text-body", lg: "text-body" };

/**
 * "Add to bag" until the book is in the bag, then the same pill becomes
 * − qty + so it's obvious it was added and easy to change.
 */
export function AddToBagButton({ slug, title = "this book", sourceId, disabled, size = "lg", className, label = "Add to bag", max = 20 }: Props) {
  const { add, items, setQuantity, ready } = useBag();
  const reduce = useReducedMotion();
  const qty = ready ? (items.find((i) => i.slug === slug)?.quantity ?? 0) : 0;
  const h = HEIGHT[size];
  const icon = size === "sm" ? "size-3.5" : "size-4";

  if (disabled) {
    return (
      <button type="button" disabled className={cn("inline-flex items-center justify-center rounded-full bg-line px-6 font-medium text-ink-soft", h, TEXT[size], className)}>
        Out of stock
      </button>
    );
  }

  return (
    <div className={cn("relative inline-flex min-w-40", h, size === "sm" && "min-w-28", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {qty === 0 ? (
          <motion.button
            key="add"
            type="button"
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => add(slug, 1, (sourceId && document.getElementById(sourceId)) || e.currentTarget)}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-6 font-medium text-white transition-colors hover:bg-leaf-deep active:translate-y-px",
              TEXT[size],
            )}
          >
            <Plus className={icon} strokeWidth={2} aria-hidden="true" />
            {label}
            <span className="sr-only"> {title}</span>
          </motion.button>
        ) : (
          <motion.div
            key="stepper"
            role="group"
            aria-label={`${title} in your bag`}
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: EASE }}
            className={cn("flex w-full items-center justify-between rounded-full bg-ink p-1 text-paper", TEXT[size])}
          >
            <button
              type="button"
              onClick={() => setQuantity(slug, qty - 1)}
              className="grid aspect-square h-full place-items-center rounded-full transition-colors hover:bg-white/15"
            >
              {qty === 1 ? <Trash2 className={icon} strokeWidth={1.75} aria-hidden="true" /> : <Minus className={icon} strokeWidth={2} aria-hidden="true" />}
              <span className="sr-only">{qty === 1 ? "Remove from bag" : "One fewer"}</span>
            </button>
            <span className="flex items-baseline gap-1.5 px-2 tabular-nums" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={qty}
                  initial={reduce ? false : { y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? undefined : { y: 10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold"
                >
                  {qty}
                </motion.span>
              </AnimatePresence>
              {size !== "sm" ? <span className="text-small text-paper/70">in bag</span> : null}
            </span>
            <button
              type="button"
              disabled={qty >= max}
              onClick={() => setQuantity(slug, qty + 1)}
              className="grid aspect-square h-full place-items-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-40"
            >
              <Plus className={icon} strokeWidth={2} aria-hidden="true" />
              <span className="sr-only">One more</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
