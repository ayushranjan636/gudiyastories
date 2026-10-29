import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogue, getProduct } from "@/features/catalogue/repo";
import { formatINR } from "@/lib/money";
import { formatAges } from "@/lib/format";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/config/site";
import { BuyBox, MobileBuyBar } from "../../books/[slug]/buy-box";
import { FannedCovers } from "./fanned-covers";
import { BUNDLES } from "../../../../../prisma/data/catalogue";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { products } = await getCatalogue();
  return products.filter((p) => p.type === "BUNDLE").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const share = BUNDLES.find((b) => b.slug === p.slug)?.shareImage;
  return {
    title: p.title,
    description: p.shortDescription,
    alternates: { canonical: `/sets/${p.slug}` },
    ...(share ? { openGraph: { images: [{ url: share.src, width: share.width, height: share.height, alt: share.alt }] } } : {}),
  };
}

export default async function SetPage({ params }: Params) {
  const { slug } = await params;
  const { products } = await getCatalogue();
  const set = products.find((x) => x.slug === slug && x.type === "BUNDLE");
  if (!set) notFound();
  const bySlug = new Map(products.map((x) => [x.slug, x]));
  const parts = set.components.flatMap((c) => {
    const p = bySlug.get(c.slug);
    return p ? [{ ...p, quantity: c.quantity }] : [];
  });
  const singles = parts.reduce((n, p) => n + p.pricePaise * p.quantity, 0);
  const save = singles - set.pricePaise;
  const coverId = `set-${set.slug}`;

  return (
    <>
      <section className="content-grid grid gap-12 pt-10 pb-16 md:pt-16 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <div id={coverId} className="rounded-2xl bg-paper-deep px-6 py-14">
            <FannedCovers covers={parts.map((p) => p.cover)} />
          </div>
        </div>
        <div className="lg:col-span-6">
          <p className="label-caps text-ink-soft">A set of {parts.length}</p>
          <h1 className="mt-3 text-h2">{set.title}</h1>
          <p className="mt-3 text-lead text-ink-soft">{formatAges(set.ageMin, set.ageMax)}</p>
          <p className="mt-6 max-w-[56ch]">{set.shortDescription}</p>

          <div className="mt-8 rounded-2xl border border-line p-5">
            <div className="flex items-baseline justify-between text-small">
              <span className="text-ink-soft">Bought one by one</span>
              <span className="tabular-nums text-ink-soft line-through">{formatINR(singles)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-medium">As a set</span>
              <span className="font-display text-h3 tabular-nums">{formatINR(set.pricePaise)}</span>
            </div>
            {save > 0 ? (
              <p className="mt-3 rounded-lg bg-lime/20 px-3 py-2 text-small font-medium">
                You save {formatINR(save)} compared with buying separately.
              </p>
            ) : null}
          </div>

          <div id="buy-box" className="mt-8">
            <BuyBox
              slug={set.slug}
              sku={set.sku}
              title={set.title}
              pricePaise={set.pricePaise}
              mrpPaise={set.mrpPaise}
              available={set.available}
              coverId={coverId}
              showMrpSaving={false}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="inside-title" className="content-grid pb-10">
        <h2 id="inside-title" className="text-h3">
          In this set
        </h2>
        <ol className="mt-6 border-t border-line">
          {parts.map((p, i) => (
            <li key={p.slug} className="grid grid-cols-[2rem_4.5rem_1fr_auto] items-center gap-4 border-b border-line py-5 sm:gap-6">
              <span className="text-small text-ink-soft tabular-nums">0{i + 1}</span>
              <Image src={p.cover.src} alt="" width={p.cover.width} height={p.cover.height} className="w-[4.5rem] rounded-[2px]" />
              <div className="min-w-0">
                <Link href={`/books/${p.slug}`} className="font-display text-h4 hover:text-leaf">
                  {p.title}
                </Link>
                <p className="mt-1 hidden max-w-[60ch] text-small text-ink-soft sm:block">{p.shortDescription}</p>
              </div>
              <p className="text-small text-ink-soft tabular-nums">{formatAges(p.ageMin, p.ageMax)}</p>
            </li>
          ))}
        </ol>
      </section>

      <MobileBuyBar slug={set.slug} title={set.title} pricePaise={set.pricePaise} available={set.available} coverId={coverId} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: set.title,
          description: set.shortDescription,
          sku: set.sku,
          brand: { "@type": "Brand", name: "Gudiya Stories" },
          image: parts.map((p) => `${SITE.url}${p.cover.src}`),
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: (set.pricePaise / 100).toFixed(2),
            availability: set.available === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          },
        }}
      />
    </>
  );
}
