import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, Clock, MessageCircle, MonitorPlay, Timer, Users } from "lucide-react";
import { getClass, getClasses } from "@/features/classes/repo";
import { formatClassPrice, formatStart } from "@/features/classes/format";
import { MediaView } from "@/components/ui/media-view";
import { ClassArtFallback, ClassCard } from "@/components/site/class-card";
import { EnquireLink } from "@/components/site/enquire-link";
import { JsonLd } from "@/components/site/json-ld";
import { sanitizeHtml, withVideoStills } from "@/lib/sanitize";
import { SITE, whatsappLink } from "@/config/site";
import { currentAdmin } from "@/server/admin";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const preview = sp.preview === "1" && Boolean(await currentAdmin());
  return getClass(slug, preview);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const c = await load(props);
  if (!c) return { title: "Class not found" };
  const image = c.mediaKind === "IMAGE" ? c.mediaUrl : c.posterUrl;
  return {
    title: c.title,
    description: c.summary,
    openGraph: { title: c.title, description: c.summary, images: image ?? undefined },
    robots: c.status === "DRAFT" ? { index: false } : undefined,
  };
}

export default async function ClassPage(props: Props) {
  const c = await load(props);
  if (!c) notFound();
  const others = (await getClasses()).filter((x) => x.id !== c.id && x.status === "PUBLISHED").slice(0, 3);
  const closed = c.status === "CLOSED";
  const facts = [
    { icon: CalendarDays, label: "Starts", value: formatStart(c.startDate) },
    { icon: Timer, label: "Duration", value: c.duration },
    { icon: Clock, label: "When", value: c.schedule },
    { icon: MonitorPlay, label: "Where", value: c.mode },
    { icon: Users, label: "For", value: c.audience },
  ].filter((f) => f.value);
  const ask = whatsappLink(`Hello Gudiya Stories, I have a question about the class "${c.title}".`);

  return (
    <div className="pt-8 md:pt-12">
      {c.status === "DRAFT" ? (
        <p className="content-grid">
          <span className="rounded-lg bg-[#F2B91E]/25 px-3 py-1.5 text-small">Preview: this class is a draft and not visible to visitors.</span>
        </p>
      ) : null}

      <nav aria-label="Breadcrumb" className="content-grid mt-4 text-small text-ink-soft">
        <Link href="/classes" className="hover:text-ink">
          Online classes
        </Link>{" "}
        / <span className="text-ink">{c.title}</span>
      </nav>

      <div className="content-grid mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="min-w-0 lg:col-span-7">
          <h1 className="text-h2">{c.title}</h1>
          <p className="mt-4 max-w-[56ch] text-lead text-ink-soft">{c.summary}</p>
          <div className="mt-8">
            {c.mediaUrl ? (
              <MediaView
                url={c.mediaUrl}
                kind={c.mediaKind}
                poster={c.posterUrl}
                alt={c.mediaAlt ?? c.title}
                priority
                sizes="(min-width: 1024px) 680px, 100vw"
                className="aspect-video w-full rounded-2xl"
              />
            ) : (
              <ClassArtFallback title={c.title} className="aspect-video w-full rounded-2xl" />
            )}
          </div>

          {c.topics.length ? (
            <section aria-labelledby="topics-title" className="mt-14">
              <h2 id="topics-title" className="text-h3">
                What we&apos;ll cover
              </h2>
              <ol className="mt-6 grid gap-x-8 sm:grid-cols-2">
                {c.topics.map((t, i) => (
                  <li key={`${t}-${i}`} className="flex gap-4 border-t border-line py-4">
                    <span className="font-display text-ink-soft tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {c.aboutHtml.replace(/<[^>]+>/g, "").trim() ? (
            <section aria-labelledby="about-title" className="mt-14">
              <h2 id="about-title" className="text-h3">
                About the class
              </h2>
              <div className="prose-notes mt-6" dangerouslySetInnerHTML={{ __html: withVideoStills(sanitizeHtml(c.aboutHtml)) }} />
            </section>
          ) : null}
        </div>

        {/* Facts and the enquiry button, kept in view on large screens */}
        <aside className="lg:col-span-5">
          <div id="enquire" className="rounded-2xl border border-line bg-white/80 p-6 shadow-[0_30px_50px_-40px_rgb(27_26_23/0.5)] md:p-8 lg:sticky lg:top-24">
            <p className="label-caps text-ink-soft">{closed ? "Enquiries closed" : "Fee"}</p>
            <p className="mt-2 font-display text-h2 leading-none tabular-nums">{formatClassPrice(c.pricePaise)}</p>
            {c.priceNote && c.pricePaise ? <p className="mt-2 text-small text-ink-soft">{c.priceNote}</p> : null}

            {facts.length ? (
              <dl className="mt-6 divide-y divide-line border-y border-line">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 py-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={1.6} aria-hidden="true" />
                    <dt className="w-20 shrink-0 text-small text-ink-soft">{label}</dt>
                    <dd className="text-small font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {closed ? (
              <>
                <p className="mt-6 text-small text-ink-soft">This batch is full or has started. Ask about the next one.</p>
                <a href={ask} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-small font-medium text-paper hover:bg-leaf">
                  <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> Ask about the next batch
                </a>
              </>
            ) : (
              <>
                <EnquireLink
                  href={c.enquiryUrl}
                  slug={c.slug}
                  from="page"
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-leaf text-small font-medium text-white transition-colors hover:bg-leaf-deep"
                >
                  Enquire about this class <ArrowUpRight className="size-4" strokeWidth={1.6} aria-hidden="true" />
                </EnquireLink>
                <p className="mt-3 text-center text-[0.8rem] text-ink-soft">Opens a short Google Form. Nothing to pay yet.</p>
                <a href={ask} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 text-small font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4">
                  <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> Or ask on WhatsApp
                </a>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Phones: the enquiry button stays at the bottom of the screen */}
      {!closed ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-display">{c.title}</p>
              <p className="text-small tabular-nums text-ink-soft">
                {formatClassPrice(c.pricePaise)}
                {c.startDate ? ` · ${formatStart(c.startDate, "short")}` : ""}
              </p>
            </div>
            <EnquireLink href={c.enquiryUrl} slug={c.slug} from="bar" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-leaf px-5 text-small font-medium text-white">
              Enquire <ArrowUpRight className="size-4" strokeWidth={1.6} aria-hidden="true" />
            </EnquireLink>
          </div>
        </div>
      ) : null}

      {others.length ? (
        <section aria-labelledby="more-title" className="content-grid mt-24">
          <h2 id="more-title" className="text-h3">
            More classes
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.id}>
                <ClassCard c={o} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: c.title,
          description: c.summary,
          url: `${SITE.url}/classes/${c.slug}`,
          provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
          ...(c.topics.length ? { teaches: c.topics } : {}),
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            ...(c.startDate ? { startDate: c.startDate.toISOString().slice(0, 10) } : {}),
            instructor: { "@type": "Person", name: SITE.author },
          },
          offers: { "@type": "Offer", price: (c.pricePaise ?? 0) / 100, priceCurrency: "INR", availability: closed ? "https://schema.org/SoldOut" : "https://schema.org/InStock", url: c.enquiryUrl },
        }}
      />
    </div>
  );
}
