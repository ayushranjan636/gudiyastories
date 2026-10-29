"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";
import { formatINR } from "@/lib/money";
import type { CatalogueImage } from "@/features/catalogue/types";

export type ToastData = { id: number; slug: string; title: string; cover: CatalogueImage; pricePaise: number };

const VISIBLE_MS = 4000;

/** A small card that confirms an add: cover, title, bag total, and the two next steps. */
export function BagToast({
  toast,
  onClose,
  onViewBag,
  count,
  subtotalPaise,
}: {
  toast: ToastData | null;
  onClose: () => void;
  onViewBag: () => void;
  count: number;
  subtotalPaise: number;
}) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!toast || paused) return;
    timer.current = window.setTimeout(onClose, VISIBLE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [toast, paused, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-[65] flex justify-center sm:inset-x-auto sm:top-20 sm:right-6 sm:bottom-auto lg:bottom-auto" aria-live="polite">
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-paper p-4 shadow-[0_24px_48px_-24px_rgb(27_26_23/0.45)]"
          >
            <div className="flex gap-4">
              <div className="relative shrink-0">
                <Image src={toast.cover.src} alt="" width={toast.cover.width} height={toast.cover.height} className="h-20 w-auto rounded-[2px] shadow-[0_8px_16px_-10px_rgb(27_26_23/0.6)]" />
                <motion.span
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.15 }}
                  className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-leaf text-white ring-2 ring-paper"
                >
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </motion.span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-small font-medium text-leaf">Added to your bag</p>
                <p className="mt-0.5 truncate font-display text-[1.05rem] leading-snug">{toast.title}</p>
                <p className="mt-0.5 text-small text-ink-soft tabular-nums">
                  {count} {count === 1 ? "item" : "items"} · {formatINR(subtotalPaise)}
                </p>
              </div>
              <button type="button" onClick={onClose} className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full hover:bg-paper-deep">
                <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={onViewBag} className="h-10 rounded-full border border-ink/70 text-small font-medium hover:bg-paper-deep">
                View bag
              </button>
              <Link href="/checkout" onClick={onClose} className="grid h-10 place-items-center rounded-full bg-leaf text-small font-medium text-white hover:bg-leaf-deep">
                Checkout
              </Link>
            </div>
            {/* time left */}
            {!reduce ? (
              <motion.span
                key={`${toast.id}-${paused}`}
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-lime"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: paused ? 1 : 0 }}
                transition={{ duration: paused ? 0 : VISIBLE_MS / 1000, ease: "linear" }}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
