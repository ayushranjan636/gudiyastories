"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { Butterfly } from "./butterfly";

const PERCHES = "#hero-bfly-anchor, main h1, main h2, [data-perch]";

type Point = { x: number; y: number };

/** Where to sit on an element: on top of the end of its last line of text. */
function perchPoint(el: Element, size: number): Point | null {
  if (el.id === "hero-bfly-anchor") {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top };
  }
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = [...range.getClientRects()].filter((r) => r.width > 2);
  const last = rects[rects.length - 1] ?? el.getBoundingClientRect();
  if (!last.width) return null;
  // Rest just after the last word, level with the top of the letters.
  return { x: Math.min(last.right + 6, window.innerWidth - size - 8), y: last.top + last.height * 0.12 };
}

/**
 * The butterfly from the logo stays with the reader: it flies while the page
 * scrolls and lands on the nearest heading when the page settles.
 * Decorative only (aria-hidden), and off for reduced motion.
 */
export function ButterflyGuide() {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [flying, setFlying] = useState(false);
  const [size, setSize] = useState(34);
  const tx = useMotionValue(-100);
  const ty = useMotionValue(-100);
  const x = useSpring(tx, { stiffness: 55, damping: 13, mass: 0.9 });
  const y = useSpring(ty, { stiffness: 55, damping: 13, mass: 0.9 });
  const vx = useVelocity(x);
  // Larger when sitting on the hero headline, normal size everywhere else.
  const ts = useMotionValue(1);
  const scale = useSpring(ts, { stiffness: 120, damping: 18 });
  const tilt = useTransform(vx, [-900, 0, 900], [-28, 6, 34]);
  const placed = useRef(false);
  const current = useRef<Element | null>(null);

  // On the home page, wait for the hero intro to finish so the two butterflies don't overlap.
  useEffect(() => {
    if (reduce) return;
    const root = document.documentElement;
    const ready = () => root.dataset.intro !== "run";
    if (ready()) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const mo = new MutationObserver(() => ready() && (setVisible(true), mo.disconnect()));
    mo.observe(root, { attributes: true, attributeFilter: ["data-intro"] });
    return () => mo.disconnect();
  }, [reduce, pathname]);

  useEffect(() => {
    if (!visible || reduce) return;
    const root = document.documentElement;
    root.classList.add("guide-on");
    const s = window.innerWidth < 640 ? 26 : 34;

    let raf = 0;
    const pick = () => {
      raf = 0;
      const vh = window.innerHeight;
      const els = [...document.querySelectorAll(PERCHES)].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.bottom > 70 && r.top < vh - 40 && !el.closest("dialog");
      });
      // Prefer the heading closest to a third of the way down the screen.
      const line = vh * 0.33;
      let best: Element | null = null;
      let bestD = Infinity;
      for (const el of els) {
        const d = Math.abs(el.getBoundingClientRect().top - line);
        if (d < bestD) {
          bestD = d;
          best = el;
        }
      }
      let p: Point | null = best ? perchPoint(best, s) : null;
      if (!p) {
        // Nothing to land on: drift along the right edge.
        p = { x: window.innerWidth - s - 24, y: vh * 0.42 };
      }
      current.current = best;
      setSize(s);
      ts.set(best?.id === "hero-bfly-anchor" ? best.getBoundingClientRect().width / s : 1);
      tx.set(p.x);
      ty.set(p.y);
      if (!placed.current) {
        x.jump(p.x);
        y.jump(p.y);
        scale.jump(ts.get());
        placed.current = true;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const t = window.setTimeout(schedule, 400); // after fonts and images settle
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove("guide-on");
    };
  }, [visible, reduce, pathname, tx, ty, x, y, ts, scale]);

  // Flying while the spring is still travelling; landed once it's close.
  useMotionValueEvent(x, "change", () => {
    const far = Math.abs(x.get() - tx.get()) + Math.abs(y.get() - ty.get()) > 6;
    if (far !== flying) setFlying(far);
  });

  if (reduce || !visible) return null;

  return (
    <motion.div aria-hidden="true" className="pointer-events-none fixed top-0 left-0 z-40 origin-top-left" style={{ x, y, scale, width: size }}>
      <motion.div
        style={{ rotate: flying ? tilt : 14 }}
        animate={flying ? { y: [0, -7, 0, 5, 0] } : { y: 0 }}
        transition={flying ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      >
        <Butterfly fast={flying} flapping={!flying} className="w-full drop-shadow-[0_3px_3px_rgb(27_26_23/0.18)]" />
      </motion.div>
    </motion.div>
  );
}
