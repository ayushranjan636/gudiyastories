"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Book3D, EASE_PAGE } from "@/components/book/book-3d";
import { ValueChips } from "@/components/ui/value-chips";
import { formatINR } from "@/lib/money";
import { formatAges } from "@/lib/format";

export type DemoBook = {
  sku: string;
  title: string;
  values: string[];
  ageMin: number;
  ageMax: number | null;
  pages: number;
  pricePaise: number;
  mrpPaise: number;
  spineColor: string;
  cover: { src: string; width: number; height: number; alt: string };
};

/**
 * Styleguide demo: selecting a value re-sorts the grid with a layout animation.
 * Matching books move to the front; the rest fade back but stay in the grid.
 */
export function ValueFilterDemo({ books, values }: { books: DemoBook[]; values: { slug: string; name: string }[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const sorted = useMemo(() => {
    if (!selected) return books;
    const match = books.filter((b) => b.values.includes(selected));
    const rest = books.filter((b) => !b.values.includes(selected));
    return [...match, ...rest];
  }, [books, selected]);

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE_PAGE };

  return (
    <LayoutGroup>
      <ValueChips options={values} selected={selected} onChange={setSelected} />
      <p className="mt-4 text-small text-ink-soft" aria-live="polite">
        {selected
          ? `${books.filter((b) => b.values.includes(selected)).length} books for ${values.find((v) => v.slug === selected)?.name.toLowerCase()}`
          : `${books.length} books`}
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
        <AnimatePresence initial={false}>
          {sorted.map((b) => {
            const dim = selected !== null && !b.values.includes(selected);
            return (
              <motion.li
                key={b.sku}
                layout
                transition={transition}
                animate={{ opacity: dim ? 0.35 : 1 }}
                className="flex flex-col gap-4"
              >
                <div className="flex aspect-[3/4] items-end px-2">
                  <Book3D
                    src={b.cover.src}
                    alt={b.cover.alt}
                    width={b.cover.width}
                    height={b.cover.height}
                    pages={b.pages}
                    spineColor={b.spineColor}
                    sizes="(min-width: 1024px) 200px, 40vw"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-h4 leading-snug">{b.title}</p>
                  <p className="text-small text-ink-soft">{formatAges(b.ageMin, b.ageMax)}</p>
                  <p className="text-small">
                    <span className="font-semibold">{formatINR(b.pricePaise)}</span>{" "}
                    <s className="text-ink-soft">
                      <span className="sr-only">MRP </span>
                      {formatINR(b.mrpPaise)}
                    </s>
                  </p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </LayoutGroup>
  );
}
