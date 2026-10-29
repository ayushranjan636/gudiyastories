"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  /** Accessible name for the button that opens it, e.g. "Enlarge photo". */
  label: string;
  className?: string;
  children: ReactNode;
};

/** Click a picture to see it large. Native <dialog>: Escape, focus trap and backdrop for free. */
export function Lightbox({ src, width, height, alt, caption, label, className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" aria-label={label} onClick={() => ref.current?.showModal()} className={cn("block w-full cursor-zoom-in text-left", className)}>
        {children}
      </button>
      <dialog
        ref={ref}
        className="lightbox m-auto border-0 outline-none max-h-[94dvh] max-w-[min(94vw,72rem)] bg-transparent p-0 backdrop:bg-ink/80"
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      >
        <figure className="relative">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="94vw"
            // Sized up front: the picture fits the screen before it has loaded.
            style={{ width: `min(94vw, 72rem, calc(84dvh * ${(width / height).toFixed(4)}))`, height: "auto" }}
            className="rounded-lg bg-paper"
          />
          {caption ? <figcaption className="mt-3 text-center text-small text-paper">{caption}</figcaption> : null}
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-paper/90 text-ink hover:bg-paper"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </figure>
      </dialog>
    </>
  );
}
