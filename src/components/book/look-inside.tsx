"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BookOpen, X } from "lucide-react";
import type { CatalogueImage } from "@/features/catalogue/types";
import { track } from "@/features/analytics/track";

const Flipbook = dynamic(() => import("./flipbook").then((m) => m.Flipbook), {
  ssr: false,
  loading: () => <div className="grid h-[60vh] place-items-center text-paper/70">Opening the book…</div>,
});

export function LookInside({ slug, title, pages }: { slug: string; title: string; pages: CatalogueImage[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!pages.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          track("look_inside_opened", { productSlug: slug });
        }}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-small font-medium text-paper transition-colors hover:bg-leaf"
      >
        <BookOpen className="size-4" strokeWidth={1.5} aria-hidden="true" />
        Look inside
      </button>
      <dialog
        ref={ref}
        aria-label={`Pages from ${title}`}
        className="sheet-full !bg-ink text-paper"
        onClose={() => setOpen(false)}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <p className="font-display">{title}</p>
          <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        {open ? <Flipbook pages={pages} /> : null}
        <p className="pb-6 text-center text-small text-paper/60">Use the arrow keys, or drag a page corner.</p>
      </dialog>
    </>
  );
}
