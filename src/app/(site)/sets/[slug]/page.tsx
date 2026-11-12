import type { Metadata } from "next";
import Image from "next/image";
import { InUseStrip } from "@/components/book/in-use";
import { inUseForSet } from "@/content/gallery";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogue, getProduct } from "@/features/catalogue/repo";
import { formatINR } from "@/lib/money";
import { formatAges } from "@/lib/format";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/config/site";
import { AlsoOn } from "@/components/book/also-on";
import { BuyBox, MobileBuyBar } from "../../books/[slug]/buy-box";
import { FannedCovers } from "./fanned-covers";
import { BUNDLES } from "../../../../../prisma/data/catalogue";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { absoluteUrl, pageMetadata, snippet } from "@/lib/seo";
import { offerSchema } from "@/features/catalogue/schema";
import { getShippingRules } from "@/server/settings";
import type { CatalogueProduct } from "@/features/catalogue/types";

/** "3 picture books", "3 colouring books" or "3 books", from what the set contains. */
function setKind(parts: CatalogueProduct[]) {
  const n = parts.length;
  if (parts.every((x) => x.type === "STORY")) return `${n} picture books`;
  if (parts.every((x) => x.type === "COLOURING")) return `${n} colouring books`;
  return `${n} books`;
}

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { products } = await getCatalogue();
  return products.filter((p) => p.type === "BUNDLE").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = (await params).slug;
  const [p, { products }] = await Promise.all([getProduct(slug), getCatalogue()]);
  if (!p || p.type !== "BUNDLE") return {};
  const bySlug = new Map(products.map((x) => [x.slug, x]));
  const parts = p.components.flatMap((c) => (bySlug.get(c.slug) ? [bySlug.get(c.slug)!] : []));
  const singles = p.components.reduce((n, c) => n + (bySlug.get(c.slug)?.pricePaise ?? 0) * c.quantity, 0);
  const save = singles - p.pricePaise;
  const share = BUNDLES.find((b) => b.slug === p.slug)?.shareImage;
  const ages = formatAges(p.ageMin, p.ageMax) ?? "Children";
  return pageMetadata({
    title: p.seoTitle || `${p.title}: ${setKind(parts)}${formatAges(p.ageMin, p.ageMax) ? `, ${ages}` : ""}`,
    absolute: Boolean(p.seoTitle),
    description: snippet(
      p.seoDescription ||
        `${parts.map((x) => x.title).join(", ")}. ${setKind(parts)} by ${SITE.author} for ${ages.toLowerCase()}, ${formatINR(p.pricePaise)} as a set${save > 0 ? ` (save ${formatINR(save)})` : ""}. Delivered across India.`,
    ),
    path: `/sets/${p.slug}`,
    image: share ? { url: share.src, width: share.width, height: share.height, alt: share.alt } : { url: p.cover.src, width: p.cover.width, height: p.cover.height, alt: p.cover.alt || p.title },
  });
}

export default async function SetPage({ params }: Params) {
  const { slug } = await params;
  const [{ products }, shipping] = await Promise.all([getCatalogue(), getShippingRules()]);
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

  const share = BUNDLES.find((b) => b.slug === set.slug)?.shareImage;

  return (
    <>
      <Breadcrumbs className="content-grid pt-6" items={[{ name: "Books", href: "/books" }, { name: set.title, href: `/sets/${set.slug}` }]} />
      <section className="content-grid grid gap-12 pt-8 pb-16 lg:grid-cols-12 lg:gap-16">
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
            <AlsoOn product={set} className="mt-6" />
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
              <Image src={p.cover.src} alt={p.cover.alt} width={p.cover.width} height={p.cover.height} sizes="72px" className="w-[4.5rem] rounded-[2px]" />
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

      {inUseForSet(parts.map((p) => p.slug)).length ? (
        <InUseStrip items={inUseForSet(parts.map((p) => p.slug))} title={set.title} heading="In readers' hands" />
      ) : null}

      <MobileBuyBar slug={set.slug} title={set.title} pricePaise={set.pricePaise} available={set.available} coverId={coverId} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: set.title,
          description: set.shortDescription,
          sku: set.sku,
          url: `${SITE.url}/sets/${set.slug}`,
          brand: { "@type": "Brand", name: SITE.name },
          category: "Media > Books",
          image: [...(share ? [share.src] : []), ...parts.map((p) => p.cover.src)].map(absoluteUrl),
          audience: {
            "@type": "PeopleAudience",
            ...(set.ageMin ? { suggestedMinAge: set.ageMin } : {}),
            ...(set.ageMax ? { suggestedMaxAge: set.ageMax } : {}),
          },
          // The books in the set, each with its own page.
          isRelatedTo: parts.map((p) => ({ "@type": "Book", name: p.title, url: `${SITE.url}/books/${p.slug}`, ...(p.isbn ? { isbn: p.isbn } : {}) })),
          offers: offerSchema({ pricePaise: set.pricePaise, available: set.available, url: `${SITE.url}/sets/${set.slug}`, shipping }),
        }}
      />
    </>
  );
}
