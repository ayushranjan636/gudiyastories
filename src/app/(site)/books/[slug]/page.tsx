import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Download } from "lucide-react";
import { getCatalogue, getProduct } from "@/features/catalogue/repo";
import { Book3D } from "@/components/book/book-3d";
import { LookInside } from "@/components/book/look-inside";
import { ProductCard } from "@/components/book/product-card";
import { JsonLd } from "@/components/site/json-ld";
import { Reveal } from "@/components/motion/reveal";
import { formatINR } from "@/lib/money";
import { formatAges, formatDate } from "@/lib/format";
import { SITE } from "@/config/site";
import { getApprovedReviews } from "@/features/reviews/repo";
import { Valley } from "@/components/home/valley";
import { BuyBox, MobileBuyBar } from "./buy-box";
import { InUseStrip } from "@/components/book/in-use";
import { IN_USE } from "@/content/gallery";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { products } = await getCatalogue();
  return products.filter((p) => p.type !== "BUNDLE").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.shortDescription,
    alternates: { canonical: `/books/${p.slug}` },
    openGraph: { title: p.title, description: p.shortDescription, images: [{ url: p.cover.src, alt: p.cover.alt }] },
  };
}

export default async function BookPage({ params }: Params) {
  const { slug } = await params;
  const { products, values } = await getCatalogue();
  const p = products.find((x) => x.slug === slug);
  if (!p) notFound();
  if (p.type === "BUNDLE") permanentRedirect(`/sets/${p.slug}`);

  const valueMap = new Map(values.map((v) => [v.slug, v]));
  const bySlug = new Map(products.map((x) => [x.slug, x]));
  const coverId = `cover-${p.slug}`;
  const sets = products.filter((x) => x.type === "BUNDLE" && x.components.some((c) => c.slug === p.slug));
  const related = products
    .filter((x) => x.type !== "BUNDLE" && x.slug !== p.slug && x.values.some((v) => p.values.includes(v)))
    .slice(0, 4);
  const reviews = await getApprovedReviews(p.id);
  const isDonimalai = p.slug === "mystical-landscapes-of-donimalai";

  const details: [string, string | null][] = [
    ["Ages", formatAges(p.ageMin, p.ageMax)],
    ["Pages", p.pages ? String(p.pages) : null],
    ["Paper", p.paper],
    ["Binding", p.binding],
    ["ISBN", p.isbn],
    ["Published", p.publishedOn ? formatDate(p.publishedOn) : null],
    ["Language", "English"],
    ["Written and designed by", SITE.author],
    ["Publisher", "Gudiya Stories, Tirupati"],
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" className="content-grid pt-6 text-small text-ink-soft">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/books" className="hover:text-ink">
              Books
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {p.title}
          </li>
        </ol>
      </nav>

      <section className="content-grid grid gap-12 pt-8 pb-16 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <div className="sticky top-24 rounded-2xl bg-paper-deep px-[12%] pt-[10%] pb-[12%]">
            <div id={coverId} className="mx-auto max-w-[22rem]">
              <Book3D
                src={p.cover.src}
                alt={p.cover.alt}
                width={p.cover.width}
                height={p.cover.height}
                spineColor={p.spineColor}
                pages={p.pages ?? undefined}
                sizes="(min-width: 1024px) 420px, 80vw"
                preload
              />
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <LookInside slug={p.slug} title={p.title} pages={p.spreads} />
              {!p.spreads.length ? <p className="text-small text-ink-soft">Inside pages coming soon.</p> : null}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <ul className="flex flex-wrap gap-2">
            {p.values.map((v) => (
              <li key={v}>
                <Link
                  href={`/books?value=${v}`}
                  className="inline-flex h-8 items-center rounded-full border border-line px-3 text-small hover:border-ink/40"
                >
                  {valueMap.get(v)?.name ?? v}
                </Link>
              </li>
            ))}
          </ul>
          <h1 className="mt-5 text-h2">{p.title}</h1>
          <p className="mt-3 text-lead text-ink-soft">
            {formatAges(p.ageMin, p.ageMax)}
            {p.pages ? ` · ${p.pages} pages` : ""} · by {SITE.author}
          </p>

          <div id="buy-box" className="mt-8 border-t border-line pt-8">
            <BuyBox
              slug={p.slug}
              sku={p.sku}
              title={p.title}
              pricePaise={p.pricePaise}
              mrpPaise={p.mrpPaise}
              available={p.available}
              coverId={coverId}
            />
          </div>

          <div className="mt-10 border-t border-line pt-8">
            <h2 className="text-h4">What it&apos;s about</h2>
            {p.longDescriptionHtml ? (
              <div className="prose-notes mt-3" dangerouslySetInnerHTML={{ __html: p.longDescriptionHtml }} />
            ) : (
              <p className="mt-3 max-w-[60ch] text-lead">{p.shortDescription}</p>
            )}
            {p.goodFor.length ? (
              <>
                <h3 className="mt-8 label-caps text-ink-soft">Good for</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {p.goodFor.map((g) => (
                    <li key={g} className="rounded-full bg-paper-deep px-3 py-1 text-small">
                      {g}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="mt-10 rounded-2xl border border-line p-6">
            <p className="label-caps text-leaf">After the story</p>
            <p className="mt-2 max-w-[48ch]">
              A free printable card of questions to ask once the last page is turned, written by Bharathi for this book.
            </p>
            {p.afterTheStory ? (
              <a
                href={p.afterTheStory.url}
                className="mt-4 inline-flex items-center gap-2 font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4"
              >
                <Download className="size-4" strokeWidth={1.5} aria-hidden="true" /> Download the card (PDF)
              </a>
            ) : (
              <p className="mt-3 text-small text-ink-soft">The card for this book is being written. It will appear here.</p>
            )}
          </div>

          <dl className="mt-10 border-t border-line">
            {details
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,11rem)_1fr] gap-4 border-b border-line py-3 text-small">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
          </dl>

          {p.amazonUrl || p.flipkartUrl ? (
            <p className="mt-6 text-small text-ink-soft">
              Also on{" "}
              {p.amazonUrl ? (
                <a href={p.amazonUrl} className="text-ink underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                  Amazon
                </a>
              ) : null}
              {p.amazonUrl && p.flipkartUrl ? " and " : null}
              {p.flipkartUrl ? (
                <a href={p.flipkartUrl} className="text-ink underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                  Flipkart
                </a>
              ) : null}
              .
            </p>
          ) : null}
        </div>
      </section>

      {isDonimalai ? (
        <section aria-label="The Donimalai valley" className="relative">
          <Valley className="h-56 w-full md:h-72" />
          <div className="bg-[#2F5E28] py-10 text-paper">
            <p className="content-grid max-w-3xl text-lead text-paper/85">
              Donimalai is a real valley in Karnataka, where Bharathi grew up. The forest in this book is drawn from that
              valley.
            </p>
          </div>
        </section>
      ) : null}

      {IN_USE[p.slug]?.length ? <InUseStrip items={IN_USE[p.slug]!} title={p.title} /> : null}

      {reviews.length ? (
        <section aria-labelledby="reviews-title" className="content-grid py-16">
          <h2 id="reviews-title" className="text-h3">
            From families who bought it
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line p-6">
                <p aria-label={`${r.rating} out of 5`} className="text-leaf">
                  {"●".repeat(r.rating)}
                  <span className="text-line">{"●".repeat(5 - r.rating)}</span>
                </p>
                {r.title ? <p className="mt-3 font-display text-h4">{r.title}</p> : null}
                <p className="mt-2">{r.body}</p>
                <p className="mt-4 text-small text-ink-soft">
                  {r.displayName} · verified purchase · {formatDate(r.createdAt)}
                </p>
                {r.reply ? <p className="mt-4 border-l-2 border-lime pl-4 text-small">Gudiya Stories: {r.reply}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sets.length ? (
        <section aria-labelledby="sets-title" className="content-grid py-16">
          <Reveal>
            <h2 id="sets-title" className="text-h3">
              Often read together
            </h2>
          </Reveal>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {sets.map((s) => {
              const parts = s.components.map((c) => bySlug.get(c.slug)).filter((x) => x != null);
              const singles = parts.reduce((n, x) => n + x.pricePaise, 0);
              const save = singles - s.pricePaise;
              return (
                <li key={s.slug}>
                  <Link
                    href={`/sets/${s.slug}`}
                    className="group flex items-center gap-6 rounded-2xl border border-line p-5 transition-colors hover:border-ink/30 hover:bg-white/50"
                  >
                    <div className="flex shrink-0 -space-x-6">
                      {parts.slice(0, 3).map((x, i) => (
                        <Image
                          key={x.slug}
                          src={x.cover.src}
                          alt=""
                          width={x.cover.width}
                          height={x.cover.height}
                          className="h-24 w-auto rounded-[2px] shadow-[0_10px_18px_-12px_rgb(27_26_23/0.6)] transition-transform duration-500 ease-page group-hover:-translate-y-1"
                          style={{ rotate: `${(i - 1) * 5}deg` }}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="font-display text-h4">{s.title}</p>
                      <p className="text-small text-ink-soft">{parts.length} books</p>
                      <p className="mt-1 text-small">
                        <span className="font-medium">{formatINR(s.pricePaise)}</span>
                        {save > 0 ? <span className="text-clay"> · save {formatINR(save)}</span> : null}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {related.length ? (
        <section aria-labelledby="related-title" className="content-grid py-16">
          <h2 id="related-title" className="text-h3">
            Carries the same values
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((r) => (
              <li key={r.slug}>
                <ProductCard p={{ ...r, valueNames: r.values.map((v) => valueMap.get(v)?.name ?? v) }} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MobileBuyBar slug={p.slug} title={p.title} pricePaise={p.pricePaise} available={p.available} coverId={coverId} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": ["Book", "Product"],
          name: p.title,
          description: p.shortDescription,
          isbn: p.isbn ?? undefined,
          sku: p.sku,
          image: `${SITE.url}${p.cover.src}`,
          author: { "@type": "Person", name: SITE.author },
          publisher: { "@type": "Organization", name: "Gudiya Stories" },
          numberOfPages: p.pages ?? undefined,
          inLanguage: "en",
          typicalAgeRange: p.ageMin ? `${p.ageMin}-${p.ageMax ?? ""}` : undefined,
          datePublished: p.publishedOn ?? undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: (p.pricePaise / 100).toFixed(2),
            availability: p.available === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            url: `${SITE.url}/books/${p.slug}`,
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Books", item: `${SITE.url}/books` },
            { "@type": "ListItem", position: 2, name: p.title, item: `${SITE.url}/books/${p.slug}` },
          ],
        }}
      />
    </>
  );
}
