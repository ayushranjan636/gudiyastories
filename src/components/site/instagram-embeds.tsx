"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/** Not shown where it would distract from paying or reading an order. */
const HIDE_ON = ["/checkout", "/order/", "/receipt/", "/track"];

export function HideWhileBuying({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (HIDE_ON.some((p) => path.startsWith(p))) return null;
  return <>{children}</>;
}

/**
 * Instagram's official post embeds. Instagram's script (and its cookies) only
 * load once the section is about to scroll into view, never on page load.
 */
export function InstagramEmbeds({ posts }: { posts: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        if (window.instgrm) return window.instgrm.Embeds.process();
        const s = document.createElement("script");
        s.src = "https://www.instagram.com/embed.js";
        s.async = true;
        s.onload = () => window.instgrm?.Embeds.process();
        document.body.appendChild(s);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [posts]);

  return (
    <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
      {posts.map((url) => (
        <div key={url} className="w-[85vw] max-w-[22rem] shrink-0 snap-center md:w-auto md:max-w-none">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={`${url}?utm_source=ig_embed`}
            data-instgrm-version="14"
            style={{ margin: 0, minWidth: 0, width: "100%", maxWidth: "100%", background: "#fff", border: 0, borderRadius: 12 }}
          >
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex aspect-square items-center justify-center rounded-xl border border-line bg-white text-small text-ink-soft">
              View this post on Instagram
            </a>
          </blockquote>
        </div>
      ))}
    </div>
  );
}
