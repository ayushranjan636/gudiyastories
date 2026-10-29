"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

// A tiny paper-coloured placeholder: shown while the real image loads lazily.
export const PAPER_BLUR =
  "data:image/svg+xml;base64," +
  (typeof window === "undefined" ? Buffer.from(svg()).toString("base64") : window.btoa(svg()));

function svg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="10" viewBox="0 0 8 10"><rect width="8" height="10" fill="#F2EBDD"/><rect y="7" width="8" height="3" fill="#E4DCCB"/></svg>`;
}

/** next/image that lazy-loads behind a paper placeholder, then fades up when ready. */
export function FadeImage({ className, onLoad, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      placeholder="blur"
      blurDataURL={PAPER_BLUR}
      {...props}
      alt={alt}
      data-loaded={loaded}
      className={cn("img-fade", className)}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
    />
  );
}
