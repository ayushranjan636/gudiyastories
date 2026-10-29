"use client";

import { FadeImage } from "@/components/ui/fade-image";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/components/motion/reveal";
import type { CatalogueImage } from "@/features/catalogue/types";

/** Covers dealt out like cards: they start stacked, then fan open. */
export function FannedCovers({ covers }: { covers: CatalogueImage[] }) {
  const reduce = useReducedMotion();
  const n = covers.length;
  const mid = (n - 1) / 2;
  const spread = n > 4 ? 13 : 17; // percent of width between covers
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-lg">
      {covers.map((c, i) => {
        const off = i - mid;
        return (
          <motion.div
            key={c.src}
            className="absolute top-1/2 left-1/2 w-[38%]"
            style={{ zIndex: i, x: "-50%", y: "-50%" }}
            initial={reduce ? false : { rotate: 0, left: "50%", top: "50%" }}
            animate={{ rotate: off * 6, left: `${50 + off * spread}%`, top: `${50 + Math.abs(off) * 3}%` }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.06 }}
          >
            <FadeImage
              src={c.src}
              alt={c.alt}
              width={c.width}
              height={c.height}
              sizes="220px"
              preload={i === 0}
              className="w-full rounded-[2px_4px_4px_2px] shadow-[0_20px_30px_-18px_rgb(27_26_23/0.6)]"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
