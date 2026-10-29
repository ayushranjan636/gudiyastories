"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useBag } from "./bag-context";
import { formatINR } from "@/lib/money";
import { formatAges } from "@/lib/format";
import { QuantityStepper } from "./quantity-stepper";
import { buttonStyles } from "@/components/ui/button";

export function BagDrawer() {
  const { open, setOpen, items, subtotalPaise, toFreeShippingPaise, freeFromPaise, setQuantity, remove, count } = useBag();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const progress = freeFromPaise ? Math.min(1, subtotalPaise / freeFromPaise) : 0;

  return (
    <dialog
      ref={ref}
      aria-labelledby="bag-title"
      className="sheet-right"
      onClose={() => setOpen(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="bag-title" className="text-h4">
            Your bag {count ? <span className="text-ink-soft">({count})</span> : null}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="-mr-2 grid size-10 place-items-center rounded-full hover:bg-paper-deep"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">Close bag</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-4 px-6">
            <p className="font-display text-h3">Nothing in here yet.</p>
            <p className="text-ink-soft">Start with a value that matters to you, or let us suggest one for your child&apos;s age.</p>
            <Link href="/books" onClick={() => setOpen(false)} className={buttonStyles({ variant: "primary" })}>
              Browse the books
            </Link>
          </div>
        ) : (
          <>
            {freeFromPaise != null ? (
            <div className="border-b border-line px-6 py-4">
              <p className="text-small">
                {toFreeShippingPaise > 0 ? (
                  <>
                    Add <strong className="font-semibold">{formatINR(toFreeShippingPaise)}</strong> more for free delivery.
                  </>
                ) : (
                  <>Delivery is free on this order.</>
                )}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-deep" aria-hidden="true">
                <div
                  className="h-full origin-left rounded-full bg-leaf transition-transform duration-500 ease-page"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
            </div>
            ) : null}

            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {items.map((i) => (
                <li key={i.slug} className="flex gap-4 py-5">
                  <div className="relative w-16 shrink-0">
                    <Image
                      src={i.product.cover.src}
                      alt=""
                      width={i.product.cover.width}
                      height={i.product.cover.height}
                      className="w-16 rounded-[2px] shadow-[0_6px_14px_-8px_rgb(27_26_23/0.5)]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={i.product.type === "BUNDLE" ? `/sets/${i.slug}` : `/books/${i.slug}`}
                      onClick={() => setOpen(false)}
                      className="font-display leading-snug hover:text-leaf"
                    >
                      {i.product.title}
                    </Link>
                    <p className="text-small text-ink-soft">{formatAges(i.product.ageMin, i.product.ageMax)}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <QuantityStepper
                        value={i.quantity}
                        onChange={(q) => setQuantity(i.slug, q)}
                        label={i.product.title}
                        size="sm"
                      />
                      <p className="font-medium tabular-nums">{formatINR(i.lineTotalPaise)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i.slug)}
                      className="self-start text-small text-ink-soft underline underline-offset-4 hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-line bg-paper-deep/60 px-6 py-5">
              <div className="flex items-baseline justify-between">
                <p>Subtotal</p>
                <p className="font-display text-h4 tabular-nums">{formatINR(subtotalPaise)}</p>
              </div>
              <p className="mt-1 text-small text-ink-soft">Delivery and any discount are worked out at checkout.</p>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className={buttonStyles({ variant: "primary", size: "lg", className: "mt-4 w-full" })}
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
