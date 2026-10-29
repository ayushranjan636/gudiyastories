"use client";

import { useMemo, useRef, useState } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";

const PALETTE = ["#8DB6E6", "#D7B4DD", "#A9C95A", "#65D428", "#F2B91E", "#E0569E", "#7FAFD8", "#F4C7A1"];
const C = 200;

function petal(r0: number, r1: number, w: number) {
  const len = r1 - r0;
  return `M${C} ${C - r0}C${C + w} ${C - r0 - len * 0.28} ${C + w * 0.62} ${C - r1 + len * 0.12} ${C} ${C - r1}C${C - w * 0.62} ${
    C - r1 + len * 0.12
  } ${C - w} ${C - r0 - len * 0.28} ${C} ${C - r0}Z`;
}

type Shape = { d?: string; circle?: { cx: number; cy: number; r: number }; rot: number; ring: number };

function buildMandala(): Shape[] {
  const shapes: Shape[] = [];
  shapes.push({ circle: { cx: C, cy: C, r: 18 }, rot: 0, ring: 0 });
  const rings = [
    { n: 8, kind: "petal", r0: 20, r1: 62, w: 20 },
    { n: 8, kind: "petal", r0: 44, r1: 92, w: 16, offset: 0.5 },
    { n: 16, kind: "dot", r: 100, size: 6 },
    { n: 12, kind: "petal", r0: 108, r1: 150, w: 19 },
    { n: 12, kind: "petal", r0: 118, r1: 168, w: 11, offset: 0.5 },
    { n: 24, kind: "dot", r: 176, size: 5 },
    { n: 24, kind: "petal", r0: 182, r1: 198, w: 10 },
  ] as const;
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i++) {
      const rot = (360 / ring.n) * (i + ("offset" in ring ? ring.offset : 0));
      if (ring.kind === "petal") shapes.push({ d: petal(ring.r0, ring.r1, ring.w), rot, ring: ri + 1 });
      else shapes.push({ circle: { cx: C, cy: C - ring.r, r: ring.size }, rot, ring: ri + 1 });
    }
  });
  return shapes;
}

/**
 * A mandala that starts as line art and colours itself in, ring by ring,
 * as the section scrolls through the viewport.
 */
export function SelfColouringMandala({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const shapes = useMemo(() => buildMandala(), []);
  const reduce = useReducedMotion();
  const [filled, setFilled] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.35"] });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduce) return;
    // Colour stays once applied, like a real colouring page.
    setFilled((f) => Math.max(f, Math.round(Math.min(1, Math.max(0, p)) * shapes.length)));
  });

  const shown = reduce ? shapes.length : filled;

  return (
    <div ref={ref} className={className}>
    <svg viewBox="0 0 400 400" className="w-full" role="img" aria-label="A mandala being coloured in">
      <circle cx={C} cy={C} r={199} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" opacity="0.25" />
      {shapes.map((s, i) => {
        const fill = i < shown ? PALETTE[(s.ring * 3 + (i % 2)) % PALETTE.length] : "var(--paper)";
        const common = {
          fill,
          stroke: "var(--ink)",
          strokeWidth: 1.1,
          transform: `rotate(${s.rot} ${C} ${C})`,
          style: { transition: "fill 520ms cubic-bezier(0.22,1,0.36,1)" },
        };
        return s.d ? <path key={i} d={s.d} {...common} /> : <circle key={i} {...s.circle!} {...common} />;
      })}
    </svg>
    </div>
  );
}
