import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { MediaView } from "@/components/ui/media-view";
import { formatClassPrice, startLabel } from "@/features/classes/format";
import { cn } from "@/lib/cn";
import { EnquireLink } from "./enquire-link";

export type ClassCardData = {
  slug: string;
  title: string;
  summary: string;
  startDate: Date | null;
  duration: string;
  pricePaise: number | null;
  priceNote: string | null;
  audience: string | null;
  mediaKind: string | null;
  mediaUrl: string | null;
  posterUrl: string | null;
  mediaAlt: string | null;
  enquiryUrl: string;
  status: string;
};

/** A soft, branded stand-in when a class has no picture yet. */
export function ClassArtFallback({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-paper-deep", className)} aria-hidden="true">
      <span className="absolute -top-10 -left-8 size-40 rounded-full bg-lime/40 blur-2xl" />
      <span className="absolute -right-6 -bottom-12 size-44 rounded-full bg-leaf/25 blur-2xl" />
      <span className="absolute inset-0 grid place-items-center font-display text-[5rem] leading-none text-ink/15">{title.trim().charAt(0) || "G"}</span>
    </div>
  );
}

export function ClassCard({ c, priority }: { c: ClassCardData; priority?: boolean }) {
  const closed = c.status === "CLOSED";
  const start = startLabel(c.startDate);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white/70 transition-shadow duration-500 ease-page hover:shadow-[0_30px_50px_-34px_rgb(27_26_23/0.45)]">
      <Link href={`/classes/${c.slug}`} className="relative block" aria-label={`${c.title}: details`}>
        {c.mediaUrl ? (
          <MediaView
            variant="thumb"
            url={c.mediaUrl}
            kind={c.mediaKind}
            poster={c.posterUrl}
            alt={c.mediaAlt ?? c.title}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="aspect-[4/3] w-full transition-transform duration-700 ease-page group-hover:scale-[1.02]"
          />
        ) : (
          <ClassArtFallback title={c.title} className="aspect-[4/3] w-full" />
        )}
        <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {start ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/95 px-3 py-1 text-[0.8rem] font-medium shadow-sm">
              <CalendarDays className="size-3.5" strokeWidth={1.6} aria-hidden="true" /> {start}
            </span>
          ) : null}
          {closed ? <span className="rounded-full bg-ink px-3 py-1 text-[0.8rem] font-medium text-paper">Enquiries closed</span> : null}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-small text-ink-soft">{[c.audience, c.duration].filter(Boolean).join(" · ")}</p>
        <h3 className="mt-2 font-display text-h4 leading-tight">
          <Link href={`/classes/${c.slug}`} className="hover:text-leaf">
            {c.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-ink-soft">{c.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-line pt-5">
          <p>
            <span className="font-display text-h4 tabular-nums">{formatClassPrice(c.pricePaise)}</span>
            {c.priceNote && c.pricePaise ? <span className="block text-[0.8rem] text-ink-soft">{c.priceNote}</span> : null}
          </p>
          {closed ? (
            <Link href={`/classes/${c.slug}`} className="text-small font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4">
              Details
            </Link>
          ) : (
            <EnquireLink
              href={c.enquiryUrl}
              slug={c.slug}
              from="card"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-small font-medium text-paper transition-colors hover:bg-leaf"
            >
              Enquire <ArrowUpRight className="size-4" strokeWidth={1.6} aria-hidden="true" />
            </EnquireLink>
          )}
        </div>
      </div>
    </article>
  );
}
