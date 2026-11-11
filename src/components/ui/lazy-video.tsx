"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  poster: string;
  width: number;
  height: number;
  label: string;
  /**
   * Ambient: a short silent loop that plays by itself while on screen (like a
   * moving photo). Otherwise a normal video the visitor starts, with sound.
   */
  ambient?: boolean;
  className?: string;
};

/**
 * Videos that cost nothing until they're needed: only the poster loads with
 * the page; the video file is fetched when it comes near the screen. Ambient
 * loops pause when scrolled away and never autoplay with reduced motion.
 */
export function LazyVideo({ src, poster, width, height, label, ambient = false, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const visible = useRef(false);
  const autoplay = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loader = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNear(true);
          loader.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    loader.observe(el);
    if (!ambient || reduce) return () => loader.disconnect();
    el.muted = true; // React doesn't always reflect `muted`; browsers only autoplay muted video
    el.defaultMuted = true;
    autoplay.current = true;
    const player = new IntersectionObserver(
      ([e]) => {
        visible.current = Boolean(e?.isIntersecting);
        // Before the file has loaded there's nothing to play; onLoadedData starts it then.
        if (visible.current && el.readyState >= 2) void el.play().catch(() => {});
        else if (!visible.current) el.pause();
      },
      { threshold: 0.35 },
    );
    player.observe(el);
    return () => {
      loader.disconnect();
      player.disconnect();
    };
  }, [ambient]);

  return (
    <div className={cn("relative overflow-hidden bg-paper-deep", className)} style={{ aspectRatio: `${width} / ${height}` }}>
      <video
        ref={ref}
        poster={poster}
        width={width}
        height={height}
        aria-label={label}
        playsInline
        muted={ambient}
        loop={ambient}
        controls={!ambient && started}
        preload={near ? "metadata" : "none"}
        src={near ? src : undefined}
        onLoadedData={(e) => {
          setReady(true);
          if (autoplay.current && visible.current) void e.currentTarget.play().catch(() => {});
        }}
        onPlay={() => setStarted(true)}
        className={cn("absolute inset-0 size-full", ambient ? "object-cover" : "bg-ink object-contain")}
      />
      {/* Soft shimmer while an ambient clip is still on its way */}
      {ambient && !ready ? <span aria-hidden="true" className="lazy-shimmer absolute inset-0" /> : null}
      {!ambient && !started ? (
        <button
          type="button"
          onClick={() => {
            setNear(true);
            setStarted(true);
            requestAnimationFrame(() => void ref.current?.play().catch(() => {}));
          }}
          className="group absolute inset-0 grid place-items-center bg-ink/10 transition-colors hover:bg-ink/20"
          aria-label={`Play: ${label}`}
        >
          <span className="grid size-16 place-items-center rounded-full bg-paper/95 text-ink shadow-[0_10px_24px_-10px_rgb(27_26_23/0.55)] transition-transform duration-300 ease-page group-hover:scale-105">
            <Play className="ml-1 size-7" strokeWidth={1.5} fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
