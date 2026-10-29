"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Butterfly } from "@/components/motion/butterfly";

type Path = { x: number[]; y: number[]; rotate: number[]; size: number };

/**
 * On the first visit of a session, a butterfly lifts off the open book in the
 * logo and flutters along a curve to settle beside the headline.
 */
export function HeroButterflyFlight() {
  const [path, setPath] = useState<Path | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "run") return;
    const section = document.getElementById("hero");
    const start = document.getElementById("hero-bfly-start");
    const anchor = document.getElementById("hero-bfly-anchor");
    if (!section || !start || !anchor) {
      root.dataset.intro = "done";
      return;
    }
    const s = section.getBoundingClientRect();
    const a = start.getBoundingClientRect();
    const b = anchor.getBoundingClientRect();
    const size = b.width;
    const sx = a.left - s.left - size / 2;
    const sy = a.top - s.top - size / 2;
    const ex = b.left - s.left;
    const ey = b.top - s.top;
    // A loose S-curve: up and away from the book, a drift, then a settle.
    const dx = ex - sx;
    const dy = ey - sy;
    const raf = requestAnimationFrame(() =>
      setPath({
      size,
      x: [sx, sx + dx * 0.1 - 30, sx + dx * 0.45, sx + dx * 0.78 + 20, ex],
      y: [sy, sy + dy * 0.35 - 70, sy + dy * 0.55 - 20, ey - 50, ey],
      rotate: [-10, -24, 8, -6, 14],
      }),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!path) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-20"
      style={{ width: path.size }}
      initial={{ x: path.x[0], y: path.y[0], rotate: path.rotate[0], opacity: 0, scale: 0.6 }}
      animate={{ x: path.x, y: path.y, rotate: path.rotate, opacity: [0, 1, 1, 1, 1], scale: [0.6, 1.25, 1.1, 1.05, 1] }}
      transition={{ duration: 1.25, delay: 0.55, ease: [0.45, 0, 0.25, 1], times: [0, 0.2, 0.5, 0.8, 1] }}
      onAnimationComplete={() => {
        document.documentElement.dataset.intro = "done";
        setPath(null);
      }}
    >
      <Butterfly fast className="w-full" />
    </motion.div>
  );
}
