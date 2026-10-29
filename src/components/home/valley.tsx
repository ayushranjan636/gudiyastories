"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Donimalai valley: four layered hill silhouettes drifting at different
 * speeds, and three small hikers walking the ridge. Under 40px of travel.
 */
export function Valley({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const far = useTransform(scrollYProgress, [0, 1], [-8, 8]);
  const mid = useTransform(scrollYProgress, [0, 1], [-18, 18]);
  const near = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const walk = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const sun = useTransform(scrollYProgress, [0, 1], [20, -20]);

  const y = (v: typeof far) => (reduce ? 0 : v);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" className="size-full">
        <motion.circle cx="1090" cy="150" r="42" fill="#F2B91E" opacity="0.9" style={{ y: y(sun) }} />
        <motion.path
          style={{ y: y(far) }}
          fill="#C9D9B0"
          d="M0 230C120 190 210 150 320 170C430 190 470 120 600 110C730 100 790 170 900 160C1010 150 1080 90 1210 100C1320 108 1390 150 1440 170V420H0Z"
        />
        <motion.path
          style={{ y: y(mid) }}
          fill="#8DB46A"
          d="M0 290C90 260 180 220 300 236C420 252 480 200 590 196C700 192 780 250 880 246C990 242 1060 196 1180 200C1290 204 1370 240 1440 254V420H0Z"
        />
        <motion.g style={{ y: y(near) }}>
          <path
            id="ridge"
            fill="#4F7F3A"
            d="M0 336C110 316 200 290 330 300C460 310 540 276 660 280C780 284 860 318 980 314C1100 310 1190 282 1300 288C1370 292 1410 304 1440 312V420H0Z"
          />
          {/* hikers on the ridge */}
          <motion.g style={{ x: reduce ? 60 : walk }}>
            {[0, 26, 50].map((dx, i) => (
              <g key={i} transform={`translate(${520 + dx} ${276 - (i === 1 ? 2 : 0)})`} fill="var(--ink)">
                <circle cx="0" cy="-17" r="3.4" />
                <path d="M-2.2 -13H2.2L3 -3H-3Z" />
                <path d="M-2 -3L-4.5 6M2 -3L4 6" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
                {i === 0 ? <path d="M3 -13L8 -2" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" /> : null}
                <rect x="-5.8" y="-13" width="3.6" height="6" rx="1" fill="#E0569E" />
              </g>
            ))}
          </motion.g>
        </motion.g>
        <path
          fill="#2F5E28"
          d="M0 380C140 364 260 352 400 360C540 368 640 350 760 352C880 354 980 372 1100 370C1220 368 1340 352 1440 356V420H0Z"
        />
        {/* trees */}
        {[80, 150, 1230, 1300, 1370].map((x, i) => (
          <g key={x} transform={`translate(${x} ${362 - (i % 2) * 6})`} fill="#1F4A1C">
            <path d="M0 -46L14 -10H-14Z" />
            <path d="M0 -30L17 4H-17Z" />
            <rect x="-2" y="4" width="4" height="10" />
          </g>
        ))}
      </svg>
    </div>
  );
}
