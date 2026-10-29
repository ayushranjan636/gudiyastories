import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { getCatalogue } from "@/features/catalogue/repo";
import { getPublishedResources } from "@/features/resources/repo";
import { AfterTheStoryCard } from "@/components/site/after-the-story-card";
import { SubscribeForm } from "./subscribe-form";

export const metadata: Metadata = {
  title: "Free resources",
  description: "Free after-the-story question cards, colouring pages and reading tips from Gudiya Stories.",
};

const KIND_LABEL: Record<string, string> = {
  AFTER_THE_STORY: "After the story card",
  COLOURING_PAGE: "Colouring page",
  READING_TIP: "Reading tip",
  OTHER: "Resource",
};

export default async function ResourcesPage() {
  const [{ products }, resources] = await Promise.all([getCatalogue(), getPublishedResources()]);
  const stories = products.filter((p) => p.type === "STORY");

  return (
    <>
      <section className="content-grid grid items-center gap-12 pt-10 pb-16 md:pt-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="label-caps text-ink-soft">Free resources</p>
          <h1 className="mt-4 text-hero">For after the last page.</h1>
          <p className="mt-6 max-w-[50ch] text-lead text-ink-soft">
            Question cards to talk about a story, colouring pages to print, and short notes on reading aloud. Free to download.
            Leaving your email is optional.
          </p>
        </div>
        <div className="lg:col-span-6">
          <AfterTheStoryCard />
        </div>
      </section>

      <section aria-labelledby="dl-title" className="content-grid">
        <h2 id="dl-title" className="text-h3">
          Download
        </h2>
        {resources.length ? (
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {resources.map((r) => (
              <li key={r.slug}>
                <a
                  href={`/resources/${r.slug}`}
                  className="group flex items-center gap-5 rounded-2xl border border-line p-5 transition-colors hover:border-ink/30 hover:bg-white/50"
                >
                  {r.product ? (
                    <Image src={r.product.cover.src} alt="" width={r.product.cover.width} height={r.product.cover.height} className="w-14 rounded-[2px]" />
                  ) : null}
                  <span className="flex-1">
                    <span className="label-caps block text-ink-soft">{KIND_LABEL[r.kind]}</span>
                    <span className="mt-1 block font-display text-h4">{r.title}</span>
                    {r.description ? <span className="mt-1 block text-small text-ink-soft">{r.description}</span> : null}
                  </span>
                  <Download className="size-5 text-leaf transition-transform group-hover:translate-y-0.5" strokeWidth={1.5} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-8">
            <p className="max-w-[56ch]">
              Bharathi is writing a card for each book. They will appear here as each one is finished. Leave your email below and
              we&apos;ll tell you when they are ready.
            </p>
            <ul className="mt-6 flex flex-wrap gap-3">
              {stories.map((s) => (
                <li key={s.slug}>
                  <Link href={`/books/${s.slug}`} className="inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-small hover:border-ink/40">
                    <Image src={s.cover.src} alt="" width={s.cover.width} height={s.cover.height} className="h-7 w-auto rounded-full object-cover" />
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="sub-title" className="content-grid pt-20">
        <div className="grid gap-8 rounded-[28px] bg-paper-deep p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 id="sub-title" className="text-h3">
              Hear about new cards and books
            </h2>
            <p className="mt-3 text-ink-soft">Only when there is something new. Unsubscribe from any email.</p>
          </div>
          <SubscribeForm source="resources-page" />
        </div>
      </section>
    </>
  );
}
