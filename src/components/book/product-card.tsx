"use client";

import Link from "next/link";
import { FadeImage } from "@/components/ui/fade-image";
import { Book3D } from "@/components/book/book-3d";
import { formatINR } from "@/lib/money";
import { formatAges } from "@/lib/format";
import type { CatalogueProduct } from "@/features/catalogue/types";
import { AddToBagButton } from "@/features/bag/add-to-bag-button";

export function productHref(p: Pick<CatalogueProduct, "type" | "slug">) {
  return p.type === "BUNDLE" ? (`/sets/${p.slug}` as const) : (`/books/${p.slug}` as const);
}

type CardProduct = Pick<
  CatalogueProduct,
  "slug" | "title" | "type" | "cover" | "spineColor" | "pages" | "ageMin" | "ageMax" | "pricePaise" | "mrpPaise" | "available" | "components"
> & { valueNames: string[]; componentCovers?: CatalogueProduct["cover"][] };

export function ProductCard({ p, priority }: { p: CardProduct; priority?: boolean }) {
  const soldOut = p.available === 0;
  const coverId = `card-cover-${p.slug}`;
  const savings = p.mrpPaise - p.pricePaise;

  return (
    <article className="group relative flex h-full flex-col">
      <Link href={productHref(p)} className="relative block rounded-lg px-6 pt-6 pb-8" aria-label={p.title}>
        <div className="absolute inset-0 -z-10 rounded-lg bg-paper-deep transition-colors duration-500 group-hover:bg-[#ECE3D0]" />
        {p.type === "BUNDLE" && p.componentCovers?.length ? (
          <div id={coverId} className="relative mx-auto aspect-[3/4] w-[78%]">
            {p.componentCovers.slice(0, 3).map((c, i, arr) => (
              <FadeImage
                key={c.src}
                src={c.src}
                alt=""
                width={c.width}
                height={c.height}
                sizes="200px"
                className="absolute top-1/2 left-1/2 w-[72%] rounded-[2px] shadow-[0_16px_24px_-16px_rgb(27_26_23/0.6)] transition-transform duration-500 ease-page"
                style={{
                  transform: `translate(-50%, -50%) translateX(${(i - (arr.length - 1) / 2) * 26}%) rotate(${(i - (arr.length - 1) / 2) * 7}deg)`,
                  zIndex: i,
                }}
              />
            ))}
          </div>
        ) : (
          <div id={coverId} className="mx-auto w-[72%]">
            <Book3D
              src={p.cover.src}
              alt=""
              width={p.cover.width}
              height={p.cover.height}
              spineColor={p.spineColor}
              pages={p.pages ?? undefined}
              sizes="(min-width: 1024px) 240px, 50vw"
              preload={priority}
            />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col pt-4">
        <p className="label-caps text-ink-soft">{p.valueNames.slice(0, 2).join(" · ")}</p>
        <h3 className="mt-1.5 font-display text-[1.25rem] leading-snug">
          <Link href={productHref(p)} className="hover:text-leaf">
            {p.title}
          </Link>
        </h3>
        <p className="mt-1 text-small text-ink-soft">
          {formatAges(p.ageMin, p.ageMax)}
          {p.type === "BUNDLE" ? ` · ${p.components.length} books` : p.pages ? ` · ${p.pages} pages` : ""}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="flex items-baseline gap-2">
            <span className="font-medium tabular-nums">{formatINR(p.pricePaise)}</span>
            {savings > 0 ? (
              <s className="text-small text-ink-soft tabular-nums">
                <span className="sr-only">MRP </span>
                {formatINR(p.mrpPaise)}
              </s>
            ) : null}
          </p>
          <AddToBagButton slug={p.slug} title={p.title} sourceId={coverId} disabled={soldOut} size="sm" label="Add" className="min-w-0 w-[6.5rem]" />
        </div>
      </div>
    </article>
  );
}
