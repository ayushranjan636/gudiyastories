"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A thin lime line under the header while the next page loads.
 * Starts on any same-site link click, finishes when the URL changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setState("loading");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s)); // eslint-disable-line react-hooks/set-state-in-effect -- reacting to a route change
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 500);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [pathname, search]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div
        className="h-full origin-left bg-lime shadow-[0_0_8px_var(--lime)]"
        style={{
          transform: `scaleX(${state === "loading" ? 0.82 : state === "done" ? 1 : 0})`,
          opacity: state === "idle" ? 0 : 1,
          transition:
            state === "loading"
              ? "transform 2.6s cubic-bezier(0.1, 0.7, 0.2, 1), opacity 120ms"
              : state === "done"
                ? "transform 220ms ease-out, opacity 300ms 220ms"
                : "opacity 200ms",
        }}
      />
    </div>
  );
}
