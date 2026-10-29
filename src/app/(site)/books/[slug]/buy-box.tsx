"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useBag } from "@/features/bag/bag-context";
import { AddToBagButton } from "@/features/bag/add-to-bag-button";
import { formatINR } from "@/lib/money";
import { whatsappLink } from "@/config/site";
import { track } from "@/features/analytics/track";

type Props = {
  slug: string;
  sku: string;
  title: string;
  pricePaise: number;
  mrpPaise: number;
  available: number | null;
  coverId: string;
  /** Sets show their saving against buying separately instead. */
  showMrpSaving?: boolean;
};

export function BuyBox({ slug, sku, title, pricePaise, mrpPaise, available, coverId, showMrpSaving = true }: Props) {
  const { items, setOpen } = useBag();
  const qty = items.find((i) => i.slug === slug)?.quantity ?? 0;
  const soldOut = available === 0;
  const max = available == null ? 20 : Math.max(1, Math.min(20, available));
  const savings = mrpPaise - pricePaise;
  const message = `Hello Gudiya Stories, I would like to order ${Math.max(1, qty)} × ${title} (${sku}) at ${formatINR(pricePaise)} each.`;

  useEffect(() => {
    track("product_view", { productSlug: slug, valuePaise: pricePaise });
  }, [slug, pricePaise]);

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-h2 leading-none tabular-nums">{formatINR(pricePaise)}</span>
        {savings > 0 ? (
          <>
            <s className="text-ink-soft tabular-nums">
              <span className="sr-only">MRP </span>
              {formatINR(mrpPaise)}
            </s>
            {showMrpSaving ? (
              <span className="text-small font-medium text-clay">
                You save {formatINR(savings)} ({Math.round((savings / mrpPaise) * 100)}%)
              </span>
            ) : null}
          </>
        ) : null}
      </p>
      <p className="mt-2 text-small text-ink-soft">MRP inclusive of all taxes.</p>

      {available != null && available > 0 && available <= 5 ? (
        <p className="mt-4 text-small font-medium text-clay">Only {available} left in stock.</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AddToBagButton slug={slug} title={title} sourceId={coverId} disabled={soldOut} max={max} className="min-w-52" />
        {qty > 0 ? (
          <button type="button" onClick={() => setOpen(true)} className="text-small font-medium underline decoration-lime decoration-2 underline-offset-4">
            View bag
          </button>
        ) : null}
      </div>
      <a
        href={whatsappLink(message)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp_click", { productSlug: slug })}
        className="mt-4 inline-flex items-center gap-2 text-small font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4"
      >
        <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" />
        {soldOut ? "Ask on WhatsApp when it is back" : "Or order on WhatsApp"}
      </a>
    </div>
  );
}

export function MobileBuyBar({ slug, title, pricePaise, available, coverId }: Omit<Props, "sku" | "mrpPaise" | "showMrpSaving">) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById("buy-box");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e!.isIntersecting && e!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] transition-transform duration-300 ease-page lg:hidden"
      style={{ transform: show ? "translateY(0)" : "translateY(110%)" }}
      aria-hidden={!show}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-display">{title}</p>
          <p className="text-small tabular-nums">{formatINR(pricePaise)}</p>
        </div>
        <AddToBagButton slug={slug} title={title} sourceId={coverId} disabled={available === 0} size="md" className="min-w-36" />
      </div>
    </div>
  );
}
