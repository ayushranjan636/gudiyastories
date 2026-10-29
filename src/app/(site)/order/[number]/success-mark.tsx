"use client";

import { motion, useReducedMotion } from "motion/react";

/** A check that draws itself. (The site's butterfly lands beside the heading.) */
export function SuccessMark() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mb-8 size-20" aria-hidden="true">
      <svg viewBox="0 0 80 80" className="size-20">
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="var(--leaf)"
          strokeWidth="3"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.path
          d="M25 41l10 10 21-22"
          fill="none"
          stroke="var(--leaf)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </div>
  );
}
