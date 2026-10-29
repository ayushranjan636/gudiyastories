"use client";

import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { contrastRatio } from "@/lib/contrast";
import { formatINR } from "@/lib/money";
import { formatAges } from "@/lib/format";
import { EASE } from "@/components/motion/reveal";
import { AddToBagButton } from "@/features/bag/add-to-bag-button";
import { cn } from "@/lib/cn";

export type ShelfBook = {
  slug: string;
  title: string;
  shortDescription: string;
  spineColor: string;
  pages: number | null;
  ageMin: number | null;
  ageMax: number | null;
  pricePaise: number;
  mrpPaise: number;
  cover: { src: string; width: number; height: number; alt: string };
  valueNames: string[];
};

/** The publisher's doll, tiny, at the foot of every spine. */
function SpineDoll({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 14 18" className={className} aria-hidden="true">
      <path
        d="M7 .8C9.3.8 10.9 2.5 10.9 4.7V6c1.6 1 2.3 2.8 2.3 4.9v3.4c0 1.6-1.2 2.9-2.8 2.9H3.6C2 17.2.8 15.9.8 14.3v-3.4C.8 8.8 1.5 7 3.1 6V4.7C3.1 2.5 4.7.8 7 .8Z"
        fill={color}
      />
      <circle cx="7" cy="5" r="2.3" fill="none" stroke={color === "#FFFFFF" ? "#1B1A17" : "#FFFFFF"} strokeWidth="1" />
      <circle cx="7" cy="12" r="1.6" fill="none" stroke={color === "#FFFFFF" ? "#1B1A17" : "#FFFFFF"} strokeWidth="0.9" />
    </svg>
  );
}

function spineInk(bg: string) {
  return contrastRatio("#1B1A17", bg) >= contrastRatio("#FFFFFF", bg) ? "#1B1A17" : "#FFFFFF";
}

/**
 * A real shelf: spines stand side by side. Hover, focus or tap one and it
 * slides out; the book beside the shelf changes to match.
 */
export function Bookshelf({ books }: { books: ShelfBook[] }) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const book = books[active]!;

  return (
    <div className="grid items-end gap-10 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-7">
        <div className="no-scrollbar -mx-5 overflow-x-auto px-5 pt-10 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Books on the shelf" className="flex min-w-max items-end gap-[3px] pl-1">
            {books.map((b, i) => {
              const ink = spineInk(b.spineColor);
              const h = 272 + ((i * 37) % 64); // varied heights, like a real shelf
              const w = 54 + Math.round((b.pages ?? 16) * 0.5);
              const selected = i === active;
              return (
                <motion.button
                  key={b.slug}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls="shelf-panel"
                  id={`shelf-tab-${b.slug}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const next = (i + (e.key === "ArrowRight" ? 1 : -1) + books.length) % books.length;
                      setActive(next);
                      document.getElementById(`shelf-tab-${books[next]!.slug}`)?.focus();
                    }
                  }}
                  tabIndex={selected ? 0 : -1}
                  className="group relative shrink-0 cursor-pointer rounded-t-[3px] text-left focus-visible:outline-offset-4"
                  style={{ width: w, height: h, backgroundColor: b.spineColor, color: ink }}
                  animate={reduce ? undefined : { y: selected ? -26 : 0, rotate: selected ? -1.5 : 0 }}
                  whileHover={reduce || selected ? undefined : { y: -8 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  {/* binding bands */}
                  <span aria-hidden="true" className="absolute inset-x-0 top-3 h-px opacity-40" style={{ backgroundColor: ink }} />
                  <span aria-hidden="true" className="absolute inset-x-0 top-[18px] h-px opacity-25" style={{ backgroundColor: ink }} />
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-12 h-px opacity-25" style={{ backgroundColor: ink }} />
                  {/* subtle cloth shading across the spine */}
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[30%] bg-white/10" />
                  <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[18%] bg-black/10" />
                  <span
                    className="absolute top-7 left-1/2 flex -translate-x-1/2 rotate-180 items-center font-display text-[0.92rem] leading-[1.15] [writing-mode:vertical-rl]"
                    style={{ height: h - 92 }}
                  >
                    {b.title}
                  </span>
                  <SpineDoll className="absolute bottom-4 left-1/2 h-5 -translate-x-1/2 opacity-85" color={ink} />
                </motion.button>
              );
            })}
          </div>
          {/* The shelf itself */}
          <div aria-hidden="true" className="relative h-4">
            <div className="absolute inset-x-0 top-0 h-[10px] rounded-[2px] bg-ink" />
            <div className="absolute inset-x-3 top-[10px] h-3 bg-ink/15 blur-[6px]" />
          </div>
        </div>
        <p className="mt-6 text-small text-ink-soft">
          <span className="hidden sm:inline">Hover or use the arrow keys to take a book off the shelf.</span>
          <span className="sm:hidden">Tap a spine to take it off the shelf.</span>
        </p>
      </div>

      <div id="shelf-panel" role="tabpanel" aria-labelledby={`shelf-tab-${book.slug}`} className="min-w-0 lg:col-span-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={book.slug}
            initial={reduce ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] items-end gap-6"
          >
            <Link href={`/books/${book.slug}`} className="block">
              <FadeImage
                id={`shelf-cover-${book.slug}`}
                src={book.cover.src}
                alt={book.cover.alt}
                width={book.cover.width}
                height={book.cover.height}
                sizes="(min-width: 1024px) 220px, 40vw"
                className="w-full -rotate-2 rounded-[2px_4px_4px_2px] shadow-[0_22px_30px_-18px_rgb(27_26_23/0.55)] transition-transform duration-500 ease-page hover:rotate-0"
              />
            </Link>
            <div>
              <p className="label-caps text-ink-soft">{book.valueNames.join(" · ")}</p>
              <h3 className="mt-2 text-h3">
                <Link href={`/books/${book.slug}`} className="hover:text-leaf">
                  {book.title}
                </Link>
              </h3>
              <p className="mt-1 text-small text-ink-soft">
                {formatAges(book.ageMin, book.ageMax)} · {book.pages} pages
              </p>
              <p className="mt-3 hidden text-small sm:block">{book.shortDescription}</p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-h4">{formatINR(book.pricePaise)}</span>
                {book.mrpPaise > book.pricePaise ? (
                  <s className="text-small text-ink-soft">
                    <span className="sr-only">MRP </span>
                    {formatINR(book.mrpPaise)}
                  </s>
                ) : null}
              </p>
              <div className={cn("mt-4 flex flex-wrap items-center gap-4")}>
                <AddToBagButton slug={book.slug} sourceId={`shelf-cover-${book.slug}`} size="md" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
