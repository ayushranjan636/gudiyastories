"use client";

import { forwardRef, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import HTMLFlipBook from "react-pageflip";
import type { CatalogueImage } from "@/features/catalogue/types";

// The package's typings require every setting; we pass the ones we use.
const FlipBook = HTMLFlipBook as unknown as ComponentType<Record<string, unknown> & { children: ReactNode }>;

const Page = forwardRef<HTMLDivElement, { img: CatalogueImage; n: number }>(function Page({ img, n }, ref) {
  return (
    <div ref={ref} className="bg-paper">
      {/* eslint-disable-next-line @next/next/no-img-element -- page-flip needs plain images inside its own canvas pages */}
      <img src={img.src} alt={img.alt || `Page ${n}`} className="size-full object-cover" draggable={false} />
    </div>
  );
});

export function Flipbook({ pages }: { pages: CatalogueImage[] }) {
  const book = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void } } | null>(null);
  const first = pages[0]!;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") book.current?.pageFlip().flipNext();
      if (e.key === "ArrowLeft") book.current?.pageFlip().flipPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-6xl items-center justify-center px-4">
      <FlipBook
        ref={book}
        width={first.width}
        height={first.height}
        size="stretch"
        minWidth={240}
        maxWidth={900}
        minHeight={240}
        maxHeight={1200}
        showCover={false}
        drawShadow
        maxShadowOpacity={0.4}
        mobileScrollSupport
        usePortrait
        flippingTime={700}
        className="shadow-2xl"
      >
        {pages.map((p, i) => (
          <Page key={p.src} img={p} n={i + 1} />
        ))}
      </FlipBook>
    </div>
  );
}
