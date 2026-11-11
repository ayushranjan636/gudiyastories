import Link from "next/link";
import type { Collection } from "@/content/collections";
import { COLLECTIONS } from "@/content/collections";
import type { CatalogueProduct, CatalogueValue } from "@/features/catalogue/types";
import { ProductCard } from "@/components/book/product-card";
import { JsonLd } from "@/components/site/json-ld";
import { buttonStyles } from "@/components/ui/button";
import { SITE, whatsappLink } from "@/config/site";

/** A landing page for one search (e.g. "books about kindness"): text that answers it, then the books. */
export function CollectionView({ c, products, values }: { c: Collection; products: CatalogueProduct[]; values: CatalogueValue[] }) {
  const valueName = new Map(values.map((v) => [v.slug, v.name]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const picked = products.filter(c.pick).sort(c.sort ?? (() => 0));
  const items = picked.map((p) => ({
    ...p,
    valueNames: p.values.map((v) => valueName.get(v) ?? v),
    componentCovers: p.components.flatMap((x) => (bySlug.get(x.slug) ? [bySlug.get(x.slug)!.cover] : [])),
  }));
  const others = COLLECTIONS.filter((o) => o.slug !== c.slug);
  const url = `${SITE.url}/books/${c.slug}`;

  return (
    <div className="content-grid pt-10 md:pt-16">
      <nav aria-label="Breadcrumb" className="text-small text-ink-soft">
        <Link href="/books" className="hover:text-leaf">
          Books
        </Link>{" "}
        / <span>{c.eyebrow}</span>
      </nav>
      <header className="mt-6 max-w-3xl">
        <h1 className="text-h2">{c.h1}</h1>
        {c.intro.map((para, i) => (
          <p key={i} className={i === 0 ? "mt-5 max-w-[62ch] text-lead text-ink-soft" : "mt-4 max-w-[62ch] text-ink-soft"}>
            {para}
          </p>
        ))}
      </header>

      <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => (
          <li key={p.slug}>
            <ProductCard p={p} priority={i < 4} />
          </li>
        ))}
      </ul>

      <div className="mt-20 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {c.sections.map((s) => (
            <section key={s.h} className="mb-12">
              <h2 className="text-h3">{s.h}</h2>
              {s.body.length > 1 ? (
                <ul className="mt-4 space-y-3">
                  {s.body.map((b) => (
                    <li key={b} className="flex max-w-[62ch] gap-3">
                      <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-lime" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 max-w-[62ch]">{s.body[0]}</p>
              )}
            </section>
          ))}

          <section aria-labelledby="col-faq">
            <h2 id="col-faq" className="text-h3">
              Questions parents ask
            </h2>
            <div className="mt-5 border-t border-line">
              {c.faqs.map((f) => (
                <details key={f.q} className="group border-b border-line py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="text-xl leading-none text-ink-soft transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[62ch] text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="rounded-2xl bg-paper-deep p-6">
            <p className="font-display text-h4">Not sure which one?</p>
            <p className="mt-2 text-ink-soft">Tell us your child&apos;s age and what they like. Bharathi or the team will suggest a book.</p>
            <a
              href={whatsappLink(`Hello! I'm looking at ${c.eyebrow.toLowerCase()} and would like a suggestion.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ className: "mt-5" })}
            >
              Ask on WhatsApp
            </a>
          </div>
          <p className="mt-10 label-caps text-ink-soft">More ways to choose</p>
          <ul className="mt-3 space-y-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/books/${o.slug}`} className="underline decoration-line underline-offset-4 hover:text-leaf">
                  {o.h1}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/gallery" className="underline decoration-line underline-offset-4 hover:text-leaf">
                Pages coloured by our readers
              </Link>
            </li>
          </ul>
        </aside>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": url,
              url,
              name: c.title,
              description: c.description,
              isPartOf: { "@id": `${SITE.url}/#website` },
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: picked.length,
                itemListElement: picked.map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE.url}${p.type === "BUNDLE" ? "/sets/" : "/books/"}${p.slug}`,
                  name: p.title,
                })),
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Books", item: `${SITE.url}/books` },
                { "@type": "ListItem", position: 2, name: c.eyebrow, item: url },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: c.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />
    </div>
  );
}
