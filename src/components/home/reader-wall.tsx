"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { READER_ART } from "@/content/gallery";
import { Lightbox } from "@/components/ui/lightbox";

/**
 * A reader's coloured page, framed and hung. The frame leans gently toward the
 * pointer and a band of light passes over the glass once when it comes into view.
 */
export function FramedArt({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 120, damping: 18 });
  const sy = useSpring(py, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-5, 5]);
  const rotateX = useTransform(sy, [0, 1], [4, -4]);
  const gx = useTransform(sx, [0, 1], [20, 80]);
  const gy = useTransform(sy, [0, 1], [10, 70]);
  const glare = useMotionTemplate`radial-gradient(60% 45% at ${gx}% ${gy}%, rgb(255 255 255 / 0.22), transparent 70%)`;

  const a = READER_ART;
  return (
    <div className={className} style={{ perspective: 1200 }}>
      <motion.div
        ref={ref}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = ref.current!.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={reduce ? false : { opacity: 0, y: 24, rotate: -1.5 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, margin: "0px 0px -15% 0px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-full max-w-md"
      >
        {/* Wire and nail */}
        <svg aria-hidden="true" viewBox="0 0 200 40" className="absolute -top-9 left-1/2 w-40 -translate-x-1/2 text-ink/40">
          <path d="M20 40 L100 6 L180 40" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="100" cy="5" r="3.5" fill="currentColor" />
        </svg>

        {/* Frame */}
        <div className="relative rounded-[3px] bg-[#2b2620] p-[10px] shadow-[0_40px_60px_-30px_rgb(27_26_23/0.65),0_8px_14px_-8px_rgb(27_26_23/0.4)]">
          <div className="rounded-[1px] bg-gradient-to-br from-[#3a332b] to-[#1f1b17] p-[2px]">
            {/* Mat */}
            <div className="bg-[#fbfaf6] p-[7%] shadow-[inset_0_2px_6px_rgb(0_0_0/0.18)]">
              <div className="relative shadow-[0_0_0_1px_rgb(27_26_23/0.08)]">
                <Lightbox src={a.src} width={a.width} height={a.height} alt={a.alt} caption={a.caption} label="Look closer at the coloured page">
                  <Image src={a.src} alt={a.alt} width={a.width} height={a.height} sizes="(min-width: 1024px) 400px, 80vw" className="w-full" />
                </Lightbox>
              </div>
            </div>
          </div>
          {/* Glass: follows the pointer, plus one sweep when it first appears */}
          {!reduce ? (
            <>
              <motion.span aria-hidden="true" className="pointer-events-none absolute inset-[10px]" style={{ background: glare }} />
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[10px] overflow-hidden"
                initial={{ opacity: 1 }}
                whileInView={{ opacity: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.6, duration: 0.4 }}
              >
                <motion.span
                  className="absolute -inset-y-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                  initial={{ x: "-120%" }}
                  whileInView={{ x: "420%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
                />
              </motion.span>
            </>
          ) : null}
        </div>

        {/* Gallery label */}
        <div className="absolute -right-3 -bottom-10 rotate-[1.5deg] bg-white px-3 py-2 text-[0.8rem] leading-snug shadow-[0_8px_14px_-10px_rgb(27_26_23/0.5)] sm:-right-8">
          <p className="font-display">{a.caption}</p>
          {a.note ? <p className="text-ink-soft">{a.note}</p> : null}
        </div>
      </motion.div>
    </div>
  );
}
