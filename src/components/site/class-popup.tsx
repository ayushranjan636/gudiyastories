"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CalendarDays, X } from "lucide-react";
import { MediaView } from "@/components/ui/media-view";
import { ClassArtFallback } from "./class-card";
import { EnquireLink } from "./enquire-link";

export type PopupClass = {
  id: string;
  version: string;
  slug: string;
  title: string;
  summary: string;
  start: string | null;
  duration: string;
  price: string;
  priceNote: string | null;
  enquiryUrl: string;
  mediaKind: string | null;
  mediaUrl: string | null;
  posterUrl: string | null;
  mediaAlt: string | null;
};

const SEEN = "gs-class-popup-seen"; // this visit (sessionStorage)
const DISMISSED = "gs-class-popup-dismissed"; // closed: stay quiet for 3 days (localStorage)
const QUIET_MS = 3 * 24 * 3600 * 1000;

function store(kind: "session" | "local") {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The home-page pop-up for the one class chosen in Admin → Classes.
 * Appears once per visit, a few seconds after the page settles, and stays away
 * for three days once closed. A bottom sheet on phones, a centred card on larger screens.
 */
export function ClassPopup({ c }: { c: PopupClass }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const key = `${c.id}:${c.version}`;

  useEffect(() => {
    if (store("session")?.getItem(SEEN) === key) return;
    const d = store("local")?.getItem(DISMISSED);
    if (d) {
      const [k, at] = d.split("|");
      if (k === key && Date.now() - Number(at) < QUIET_MS) return;
    }
    let timer = 0;
    const show = () => {
      timer = window.setTimeout(() => {
        if (document.querySelector("dialog[open]")) return; // never on top of the bag or another sheet
        store("session")?.setItem(SEEN, key);
        ref.current?.showModal();
        setOpen(true);
      }, 2600);
    };
    // Wait for the hero animation to finish first.
    const root = document.documentElement;
    if (root.dataset.intro !== "run") show();
    const mo = new MutationObserver(() => {
      if (root.dataset.intro !== "run") {
        mo.disconnect();
        show();
      }
    });
    if (root.dataset.intro === "run") mo.observe(root, { attributes: true, attributeFilter: ["data-intro"] });
    return () => {
      window.clearTimeout(timer);
      mo.disconnect();
    };
  }, [key]);

  function close() {
    store("local")?.setItem(DISMISSED, `${key}|${Date.now()}`);
    setOpen(false);
    window.setTimeout(() => ref.current?.close(), reduce ? 0 : 220);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="class-popup-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="class-popup m-0 mt-auto h-fit border-0 outline-none max-h-[92dvh] w-full max-w-none overflow-visible bg-transparent p-0 backdrop:bg-ink/55 backdrop:backdrop-blur-[2px] sm:m-auto sm:w-[min(92vw,56rem)]"
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-paper shadow-[0_40px_80px_-30px_rgb(0_0_0/0.5)] sm:grid-cols-2 sm:overflow-hidden sm:rounded-3xl"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-paper/90 text-ink shadow-sm hover:bg-paper"
            >
              <X className="size-5" strokeWidth={1.5} />
            </button>

            <div className="relative">
              {c.mediaUrl ? (
                <MediaView
                  variant={c.mediaKind === "IMAGE" ? "player" : "thumb"}
                  url={c.mediaUrl}
                  kind={c.mediaKind}
                  poster={c.posterUrl}
                  alt={c.mediaAlt ?? c.title}
                  sizes="(min-width: 640px) 450px, 100vw"
                  className="aspect-[16/10] w-full sm:aspect-auto sm:h-full sm:min-h-[26rem]"
                />
              ) : (
                <ClassArtFallback title={c.title} className="aspect-[16/10] w-full sm:aspect-auto sm:h-full sm:min-h-[26rem]" />
              )}
              <span className="absolute top-4 left-4 rounded-full bg-lime px-3 py-1 text-[0.8rem] font-medium text-ink">New online class</span>
            </div>

            <div className="flex flex-col p-6 sm:p-8">
              {c.start ? (
                <p className="inline-flex items-center gap-1.5 text-small font-medium text-leaf">
                  <CalendarDays className="size-4" strokeWidth={1.6} aria-hidden="true" /> {c.start}
                </p>
              ) : null}
              <h2 id="class-popup-title" className="mt-2 font-display text-h2 leading-tight">
                {c.title}
              </h2>
              <p className="mt-3 text-ink-soft">{c.summary}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-4 text-small">
                <div>
                  <dt className="text-ink-soft">Duration</dt>
                  <dd className="mt-0.5 font-medium">{c.duration}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Fee</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {c.price}
                    {c.priceNote && c.price !== "Free" ? <span className="block font-normal text-ink-soft">{c.priceNote}</span> : null}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-col gap-3 sm:mt-auto sm:pt-6">
                <EnquireLink
                  href={c.enquiryUrl}
                  slug={c.slug}
                  from="popup"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-leaf px-6 text-small font-medium text-white transition-colors hover:bg-leaf-deep"
                >
                  Enquire now <ArrowUpRight className="size-4" strokeWidth={1.6} aria-hidden="true" />
                </EnquireLink>
                <Link href={`/classes/${c.slug}`} onClick={close} className="text-center text-small font-medium text-ink underline decoration-lime decoration-2 underline-offset-4">
                  See what the class covers
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
