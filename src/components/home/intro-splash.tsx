"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Butterfly } from "@/components/motion/butterfly";
import { cn } from "@/lib/cn";

/**
 * The welcome scene: a code-drawn take on the Gudiya Stories intro video
 * (clouds, sun, rainbow, hills, trees, the logo and "Welcome to"), in the
 * site's own colours. Drawn in SVG, so it is sharp on every screen and weighs
 * a few kilobytes instead of a video.
 *
 * Shown once per visit on the home page, while the page loads underneath
 * (at least 2.6 s, at most 3.8 s), never with reduced motion. The decision is
 * made before first paint by the script in hero.tsx (data-intro="splash");
 * leaving hands over to the hero's own intro (data-intro="run").
 */

const MIN_MS = 2600;
const MAX_MS = 3800;
const LEAVE_MS = 750;

function Cloud({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 220 96" className={className} style={style} aria-hidden="true">
      {/* soft underside */}
      <g fill="var(--paper-deep)">
        <ellipse cx="112" cy="74" rx="96" ry="18" />
      </g>
      <g fill="#ffffff" stroke="color-mix(in oklab, var(--ink) 14%, transparent)" strokeWidth="1.2">
        <path d="M30 76c-16 0-24-11-20-22 4-10 15-14 25-11 2-16 17-27 34-24 7-15 27-22 44-14 9-12 31-12 41 2 15-3 30 7 31 22 13 1 22 11 21 23-1 14-12 24-27 24H30z" />
      </g>
      <path d="M48 60c6-6 16-7 22-2M120 44c8-6 20-6 27 2" fill="none" stroke="color-mix(in oklab, var(--ink) 10%, transparent)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Tree({ className, style, tone = 0 }: { className?: string; style?: React.CSSProperties; tone?: 0 | 1 }) {
  const leaf = tone ? "color-mix(in oklab, var(--lime) 70%, var(--leaf))" : "color-mix(in oklab, var(--lime) 82%, var(--paper))";
  const shade = tone ? "color-mix(in oklab, var(--leaf) 80%, var(--lime))" : "color-mix(in oklab, var(--lime) 60%, var(--leaf))";
  return (
    <svg viewBox="0 0 120 170" className={className} style={style} aria-hidden="true">
      <path d="M57 168c2-30 2-52 0-78M60 116c8-8 14-12 22-14M58 128c-7-7-13-10-20-11" fill="none" stroke="color-mix(in oklab, var(--clay) 55%, var(--ink))" strokeWidth="7" strokeLinecap="round" />
      <g fill={shade}>
        <circle cx="34" cy="70" r="26" />
        <circle cx="86" cy="72" r="27" />
        <circle cx="60" cy="86" r="28" />
      </g>
      <g fill={leaf}>
        <circle cx="38" cy="58" r="26" />
        <circle cx="80" cy="56" r="28" />
        <circle cx="60" cy="34" r="30" />
        <circle cx="60" cy="70" r="26" />
      </g>
      <g fill="#ffffff" opacity="0.35">
        <circle cx="50" cy="26" r="7" />
        <circle cx="30" cy="52" r="5" />
      </g>
    </svg>
  );
}

const RAINBOW = [
  "color-mix(in oklab, var(--clay) 62%, var(--paper))",
  "color-mix(in oklab, #f2b91e 78%, var(--paper))",
  "color-mix(in oklab, var(--lime) 70%, var(--paper))",
  "color-mix(in oklab, var(--leaf) 45%, var(--paper))",
];

export function IntroSplash() {
  const [phase, setPhase] = useState<"idle" | "on" | "leaving" | "gone">("idle");
  const leaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "splash") {
      const id = requestAnimationFrame(() => setPhase("gone"));
      return () => cancelAnimationFrame(id);
    }
    let done = false;
    const timers: number[] = [];
    const leave = () => {
      if (done) return;
      done = true;
      setPhase("leaving");
      root.style.removeProperty("overflow");
      root.dataset.intro = "run"; // the hero's own intro plays as the scene lifts away
      timers.push(window.setTimeout(() => setPhase("gone"), LEAVE_MS));
    };
    leaveRef.current = leave;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && leave();
    const raf = requestAnimationFrame(() => setPhase("on"));
    root.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    // Leave when the page underneath is ready, but not before the scene has played.
    const loaded = document.readyState === "complete" ? Promise.resolve() : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true }));
    const min = new Promise<void>((r) => timers.push(window.setTimeout(r, MIN_MS)));
    void Promise.all([loaded, min]).then(leave);
    timers.push(window.setTimeout(leave, MAX_MS));

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
      root.style.removeProperty("overflow");
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={cn("intro-splash", phase === "leaving" && "is-leaving")}>
      <div className="is-sky" aria-hidden="true" />

      {/* Sun */}
      <svg viewBox="0 0 120 120" className="is-sun" aria-hidden="true">
        <g className="is-rays" stroke="color-mix(in oklab, #f2b91e 85%, var(--clay))" strokeWidth="5" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            // Rounded so the server and the browser print identical numbers.
            const p = (r: number, f: (x: number) => number) => (60 + f(a) * r).toFixed(2);
            return <line key={i} x1={p(36, Math.cos)} y1={p(36, Math.sin)} x2={p(52, Math.cos)} y2={p(52, Math.sin)} />;
          })}
        </g>
        <circle cx="60" cy="60" r="27" fill="#f2b91e" />
        <circle cx="52" cy="52" r="9" fill="#ffffff" opacity="0.35" />
      </svg>

      <Cloud className="is-cloud is-cloud-1" />
      <Cloud className="is-cloud is-cloud-2" />
      <Cloud className="is-cloud is-cloud-3" />
      <Cloud className="is-cloud is-cloud-4" />

      {/* Centre: welcome line, then the logo sitting under the rainbow */}
      <div className="is-center">
        <p className="is-welcome font-display">
          {"Welcome to".split("").map((ch, i) => (
            <span key={i} style={{ ["--i" as string]: i }}>
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </p>
        <div className="is-logo-wrap">
          <svg viewBox="0 0 400 210" className="is-rainbow" aria-hidden="true">
            {RAINBOW.map((c, i) => {
              const r = 190 - i * 17;
              return (
                <path
                  key={c}
                  d={`M${200 - r} 205 A ${r} ${r} 0 0 1 ${200 + r} 205`}
                  fill="none"
                  stroke={c}
                  strokeWidth="16"
                  strokeLinecap="round"
                  pathLength={1}
                  className="is-band"
                  style={{ ["--d" as string]: `${0.45 + i * 0.12}s` }}
                />
              );
            })}
          </svg>
          <div className="is-logo">
            {/* A ready-made 840 px WebP (~100 KB): no resizing on the server, so it's there on the very first visit. */}
            <Image src="/brand/gudiya-stories-lockup-intro.webp" alt="Gudiya Stories" width={840} height={666} preload unoptimized className="h-auto w-full" />
          </div>
        </div>
      </div>

      {/* Hills, meadow and flowers */}
      <svg viewBox="0 0 1600 360" preserveAspectRatio="none" className="is-hills" aria-hidden="true">
        <path className="is-hill-back" d="M0 170C180 90 360 70 560 120S900 210 1100 140 1450 60 1600 110V360H0Z" fill="color-mix(in oklab, var(--lime) 38%, var(--paper))" />
        <path className="is-hill-mid" d="M0 230C220 160 430 150 640 190S1040 260 1260 200 1500 150 1600 170V360H0Z" fill="color-mix(in oklab, var(--lime) 70%, var(--paper))" />
        <path className="is-hill-front" d="M0 290C260 250 520 248 800 270S1320 300 1600 262V360H0Z" fill="color-mix(in oklab, var(--lime) 62%, var(--leaf))" />
      </svg>
      <div className="is-flowers" aria-hidden="true">
        {[8, 19, 31, 44, 57, 69, 82, 93].map((x, i) => (
          <span key={x} style={{ left: `${x}%`, ["--i" as string]: i, background: i % 3 === 0 ? "var(--clay)" : i % 3 === 1 ? "#f2b91e" : "#ffffff" }} />
        ))}
      </div>

      <Tree className="is-tree is-tree-1" />
      <Tree className="is-tree is-tree-2" tone={1} />
      <Tree className="is-tree is-tree-3" tone={1} />
      <Tree className="is-tree is-tree-4" />

      <div className="is-bfly is-bfly-1" aria-hidden="true">
        <Butterfly fast className="w-full" />
      </div>
      <div className="is-bfly is-bfly-2" aria-hidden="true">
        <Butterfly fast className="w-full" />
      </div>

      <div className="is-progress" aria-hidden="true">
        <span />
      </div>
      <button
        type="button"
        className="is-skip"
        onClick={() => leaveRef.current()}
      >
        Skip
      </button>
    </div>
  );
}
