"use client";

import { FadeImage } from "@/components/ui/fade-image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

export const EASE_PAGE = [0.22, 1, 0.36, 1] as const;

type Book3DProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Colour of the spine, sampled from the cover. */
  spineColor?: string;
  /** Page count drives the visible thickness. */
  pages?: number;
  /** Explicit thickness in px. Overrides pages. */
  thickness?: number;
  sizes?: string;
  preload?: boolean;
  className?: string;
};

const MAX_TILT = 6; // degrees, from the brief
const REST_Y = 16; // resting turn, so the spine is visible
const REST_X = -4; // a little of the top edge shows

// Page edges: fine stacked lines drawn with an SVG pattern (no CSS gradients).
const PAGE_EDGE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='3' height='4'%3E%3Crect width='3' height='4' fill='%23F7F1E3'/%3E%3Crect width='1' height='4' fill='%23E1D7C2'/%3E%3C/svg%3E\")";
const PAGE_EDGE_TOP =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23F7F1E3'/%3E%3Crect width='4' height='1' fill='%23E1D7C2'/%3E%3C/svg%3E\")";

function thicknessFor(pages?: number) {
  if (!pages) return 10;
  return Math.round(Math.min(18, Math.max(6, pages * 0.32)));
}

function useCanHover() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return canHover;
}

/**
 * A cover rendered as a physical book: CSS perspective, a visible spine and
 * page-edge thickness. Desktop: tilts toward the cursor (max 6°) and lifts.
 * Touch: settles into place as it scrolls into view.
 * Reduced motion: renders in its final pose with no movement.
 */
export function Book3D({
  src,
  alt,
  width,
  height,
  spineColor = "#2F6B2A",
  pages,
  thickness,
  sizes = "(min-width: 1024px) 320px, 60vw",
  preload,
  className,
}: Book3DProps) {
  const t = thickness ?? thicknessFor(pages);
  const reduceMotion = useReducedMotion();
  const canHover = useCanHover();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const hovering = useMotionValue(0);
  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, (v) => REST_Y + v * MAX_TILT * 2), spring);
  const rotateX = useSpring(useTransform(py, (v) => REST_X - v * MAX_TILT * 2), spring);
  const lift = useSpring(useTransform(hovering, [0, 1], [0, -6]), spring);
  const shadowScale = useTransform(lift, [-6, 0], [0.9, 1]);
  const shadowOpacity = useTransform(lift, [-6, 0], [0.18, 0.28]);

  const interactive = canHover && !reduceMotion;

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
    hovering.set(1);
  }
  function onPointerLeave() {
    px.set(0);
    py.set(0);
    hovering.set(0);
  }

  const settle = !reduceMotion && !canHover;

  return (
    <div
      ref={ref}
      className={cn("relative w-full", className)}
      style={{ perspective: "1400px" }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <motion.div
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
        initial={settle ? { rotateY: 14, y: 18 } : false}
        whileInView={settle ? { rotateY: 0, y: 0 } : undefined}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: EASE_PAGE }}
      >
        <motion.div
          className="relative"
          style={{
            aspectRatio: `${width} / ${height}`,
            transformStyle: "preserve-3d",
            rotateY: reduceMotion ? REST_Y : rotateY,
            rotateX: reduceMotion ? REST_X : rotateX,
            y: reduceMotion ? 0 : lift,
          }}
        >
          {/* Back cover */}
          <div
            className="absolute inset-0 rounded-[2px_4px_4px_2px]"
            style={{ backgroundColor: spineColor, transform: `translateZ(${-t / 2}px) rotateY(180deg)` }}
          />
          {/* Spine (left) */}
          <div
            className="absolute top-0 h-full"
            style={{
              width: t,
              left: -t / 2,
              backgroundColor: spineColor,
              transform: "rotateY(-90deg)",
              boxShadow: "inset 0 0 0 100vmax rgb(0 0 0 / 0.14)",
            }}
          />
          {/* Page edges (right) */}
          <div
            className="absolute top-[3px] bottom-[3px]"
            style={{ width: t - 2, right: -(t - 2) / 2, backgroundImage: PAGE_EDGE, transform: "rotateY(90deg)" }}
          />
          {/* Page edges (top) */}
          <div
            className="absolute right-[3px] left-0"
            style={{ height: t - 2, top: -(t - 2) / 2, backgroundImage: PAGE_EDGE_TOP, transform: "rotateX(90deg)" }}
          />
          {/* Front cover */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[2px_4px_4px_2px] bg-paper-deep"
            style={{ transform: `translateZ(${t / 2}px)` }}
          >
            <FadeImage src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
            {/* Hinge crease where the cover folds into the spine */}
            <span aria-hidden="true" className="absolute inset-y-0 left-[5px] w-px bg-ink/15" />
            <span aria-hidden="true" className="absolute inset-y-0 left-[6px] w-px bg-white/25" />
          </div>
        </motion.div>
      </motion.div>

      {/* Soft contact shadow: the only shadow style on the site. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[8%] -bottom-3 -z-10 h-5 rounded-[50%] bg-ink blur-md"
        style={{ scaleX: reduceMotion ? 1 : shadowScale, opacity: reduceMotion ? 0.28 : shadowOpacity }}
      />
    </div>
  );
}
