"use client";

import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { EASE } from "@/components/motion/reveal";

type V = { slug: string; name: string; description: string; covers: { slug: string; src: string; alt: string; w: number; h: number }[] };

/**
 * Six values as a ruled list. The covers that carry the value fan out
 * beside it, like books pulled from a pile.
 */
export function ValuesExplorer({ values }: { values: V[] }) {
  const [active, setActive] = useState(values[0]!.slug);
  const reduce = useReducedMotion();
  const current = values.find((v) => v.slug === active)!;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <ol className="min-w-0 border-t border-line lg:col-span-7">
        {values.map((v, i) => {
          const on = v.slug === active;
          return (
            <li key={v.slug} className="border-b border-line">
              <Link
                href={`/books?value=${v.slug}`}
                onMouseEnter={() => setActive(v.slug)}
                onFocus={() => setActive(v.slug)}
                className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-5 sm:grid-cols-[3rem_minmax(0,11rem)_1fr_auto]"
              >
                <span className="text-small text-ink-soft tabular-nums">0{i + 1}</span>
                <span className={`font-display text-h3 transition-colors duration-300 ${on ? "text-leaf" : ""}`}>{v.name}</span>
                <span className="col-start-2 text-ink-soft sm:col-start-3">{v.description}</span>
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className={`hidden size-5 self-center transition-[transform,opacity] duration-300 ease-page sm:row-start-1 sm:col-start-4 sm:block ${
                    on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:opacity-60"
                  }`}
                />
                {/* covers inline on small screens */}
                <span className="col-span-full mt-3 flex gap-2 lg:hidden" aria-hidden="true">
                  {v.covers.slice(0, 4).map((c) => (
                    <FadeImage key={c.slug} src={c.src} alt="" width={c.w} height={c.h} className="h-16 w-auto rounded-[2px]" />
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="relative hidden min-h-[26rem] lg:col-span-5 lg:block" aria-hidden="true">
        <div className="sticky top-28 grid h-[26rem] place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {current.covers.slice(0, 4).map((c, i, arr) => {
              const mid = (arr.length - 1) / 2;
              const rot = (i - mid) * 9;
              const x = (i - mid) * 74;
              return (
                <motion.div
                  key={`${current.slug}-${c.slug}`}
                  className="absolute w-48"
                  style={{ zIndex: 10 + i }}
                  initial={reduce ? false : { opacity: 0, y: 40, rotate: 0, x: 0 }}
                  animate={{ opacity: 1, y: Math.abs(i - mid) * 10, rotate: rot, x }}
                  exit={reduce ? undefined : { opacity: 0, y: -20, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.55, ease: EASE, delay: reduce ? 0 : i * 0.05 }}
                >
                  <FadeImage
                    src={c.src}
                    alt=""
                    width={c.w}
                    height={c.h}
                    sizes="192px"
                    className="w-full rounded-[2px_4px_4px_2px] shadow-[0_24px_34px_-20px_rgb(27_26_23/0.55)]"
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
