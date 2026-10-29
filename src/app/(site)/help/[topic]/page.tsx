import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HELP } from "@/content/help";
import { SITE } from "@/config/site";

type Props = { params: Promise<{ topic: string }> };

export function generateStaticParams() {
  return Object.keys(HELP).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = HELP[(await params).topic];
  return h ? { title: h.title, description: h.summary } : {};
}

export default async function HelpPage({ params }: Props) {
  const { topic } = await params;
  const h = HELP[topic];
  if (!h) notFound();

  return (
    <div className="content-grid grid gap-12 pt-10 md:pt-16 lg:grid-cols-12">
      <nav aria-label="Help" className="lg:col-span-3">
        <ul className="flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1">
          {Object.entries(HELP).map(([k, v]) => (
            <li key={k}>
              <Link
                href={`/help/${k}`}
                aria-current={k === topic ? "page" : undefined}
                className="block rounded-full px-3 py-1.5 text-small hover:bg-paper-deep aria-[current=page]:bg-ink aria-[current=page]:text-paper lg:rounded-lg"
              >
                {v.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="lg:col-span-8">
        <h1 className="text-h2">{h.title}</h1>
        <p className="mt-4 text-lead text-ink-soft">{h.summary}</p>
        {h.draft ? (
          <p className="mt-6 rounded-xl border border-dashed border-clay/50 px-4 py-3 text-small text-clay">
            [REVIEW BY OWNER] This page is a draft. Details marked CONFIRM need the owner&apos;s sign-off before launch.
          </p>
        ) : null}
        <div className="mt-10 space-y-10">
          {h.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-h4">{s.heading}</h2>
              <div className="mt-3 space-y-3 text-ink-soft">
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-14 border-t border-line pt-6 text-small text-ink-soft">
          Still have a question? Message us on{" "}
          <a href={`https://wa.me/${SITE.whatsapp}`} className="text-ink underline underline-offset-4">
            WhatsApp
          </a>{" "}
          or write to{" "}
          <a href={`mailto:${SITE.email}`} className="text-ink underline underline-offset-4">
            {SITE.email}
          </a>
          .
        </p>
      </article>
    </div>
  );
}
