import { cn } from "@/lib/cn";

/**
 * Line-drawn butterfly in the logo's style: ink outlines, one lime wing.
 * Wings flap by scaling around the body; `flapping` adds a lazy flap every ~6s.
 */
export function Butterfly({ className, flapping = false, fast = false }: { className?: string; flapping?: boolean; fast?: boolean }) {
  const wing = cn(
    "origin-[50%_50%] [transform-box:view-box]",
    fast && "animate-[flap_0.32s_ease-in-out_infinite]",
    !fast && flapping && "animate-[flap_6s_ease-in-out_infinite]",
  );
  return (
    <svg viewBox="0 0 48 40" className={cn("overflow-visible", className)} aria-hidden="true">
      <g className={wing} style={{ transformOrigin: "24px 20px" }}>
        {/* left wings */}
        <path
          d="M23 19C19 9 9 2 4.5 5.5C0.5 8.8 4 17 11 19.5C15.5 21 20 20.4 23 19Z"
          fill="var(--lime)"
          stroke="var(--ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M23 21C17 22 10.5 26 10 31C9.6 35 14 36.4 17.5 33.4C21 30.4 22.6 25 23 21Z"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* right wings */}
        <path
          d="M25 19C29 9 39 2 43.5 5.5C47.5 8.8 44 17 37 19.5C32.5 21 28 20.4 25 19Z"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M25 21C31 22 37.5 26 38 31C38.4 35 34 36.4 30.5 33.4C27 30.4 25.4 25 25 21Z"
          fill="var(--lime)"
          stroke="var(--ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>
      {/* body and antennae */}
      <path d="M24 12.5V30" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M23.4 12.8C22 8.5 19.6 6.4 17.8 6M24.6 12.8C26 8.5 28.4 6.4 30.2 6" fill="none" stroke="var(--ink)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
