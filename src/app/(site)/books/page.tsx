import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { getCatalogue } from "@/features/catalogue/repo";
import { parseFilters } from "@/features/catalogue/filters";
import { BooksBrowser } from "./books-browser";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/config/site";
import Link from "next/link";
import { COLLECTIONS } from "@/content/collections";

export const metadata: Metadata = pageMetadata({
  title: "Children's Picture Books & Mandala Colouring Books",
  description:
    "Value-based picture books for ages 4 to 13 and mandala colouring books by early-years teacher S.V. Bharathi. Choose by value, then by age. Delivered across India.",
  path: "/books",
});

export default async function BooksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ products, values }, sp] = await Promise.all([getCatalogue(), searchParams]);
  const valueName = new Map(values.map((v) => [v.slug, v.name]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const items = products.map((p) => ({
    ...p,
    valueNames: p.values.map((v) => valueName.get(v) ?? v),
    componentCovers: p.components.flatMap((c) => {
      const cp = bySlug.get(c.slug);
      return cp ? [cp.cover] : [];
    }),
  }));

  return (
    <div className="content-grid pt-10 md:pt-16">
      <header className="max-w-3xl">
        <p className="label-caps text-ink-soft">The books</p>
        <h1 className="mt-3 text-h2">Choose by value, then by age.</h1>
        <p className="mt-4 max-w-[56ch] text-lead text-ink-soft">
          Six picture books, three colouring books and four sets. Every title is written and designed by S.V. Bharathi and
          printed in India.
        </p>
      </header>
      <nav aria-label="Popular choices" className="mt-6 flex flex-wrap gap-2">
        {COLLECTIONS.map((c) => (
          <Link key={c.slug} href={`/books/${c.slug}`} className="rounded-full border border-line px-3 py-1 text-small transition-colors hover:border-ink hover:text-leaf">
            {c.eyebrow}
          </Link>
        ))}
      </nav>
      <div className="mt-10">
        <Suspense>
          <BooksBrowser items={items} values={values} initial={parseFilters(sp)} />
        </Suspense>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Gudiya Stories books",
          url: `${SITE.url}/books`,
          isPartOf: { "@id": `${SITE.url}/#website` },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: products.length,
            itemListElement: products.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE.url}${p.type === "BUNDLE" ? "/sets/" : "/books/"}${p.slug}`,
              name: p.title,
              image: `${SITE.url}${p.cover.src}`,
            })),
          },
        }}
      />
    </div>
  );
}
