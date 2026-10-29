import { BOOKS, BUNDLES, VALUES } from "../../../prisma/data/catalogue";
import type { Catalogue, CatalogueProduct } from "./types";

const paise = (r: number) => Math.round(r * 100);

/**
 * The catalogue straight from the seed data. Used when no database is
 * configured, so the public site can be previewed and deployed before
 * the database is set up. Stock is unknown in this mode.
 */
export function staticCatalogue(): Catalogue {
  const books: CatalogueProduct[] = BOOKS.map((b) => ({
    id: b.sku,
    slug: b.slug,
    sku: b.sku,
    title: b.title,
    type: b.type,
    shortDescription: b.shortDescription,
    longDescriptionHtml: null,
    ageMin: b.ageMin,
    ageMax: b.ageMax,
    pages: b.pages,
    paper: b.paper,
    binding: b.type === "STORY" ? "Paperback" : "Paperback, perforated pages",
    isbn: b.isbn,
    publishedOn: b.publishedOn,
    pricePaise: paise(b.priceRupees),
    mrpPaise: paise(b.mrpRupees),
    spineColor: b.spineColor,
    cover: b.cover,
    values: b.values,
    goodFor: [],
    amazonUrl: null,
    flipkartUrl: null,
    featured: b.type === "STORY",
    // "Look inside": the cover, then sample pages and the back cover.
    spreads: b.inside?.length ? [b.cover, ...b.inside] : [],
    components: [],
    available: null,
    afterTheStory: null,
  }));

  const bySku = new Map(books.map((b) => [b.sku, b]));

  const bundles: CatalogueProduct[] = BUNDLES.map((s) => {
    const parts = s.componentSkus.map((sku) => {
      const p = bySku.get(sku);
      if (!p) throw new Error(`Bundle ${s.sku} refers to unknown SKU ${sku}`);
      return p;
    });
    const first = parts[0]!;
    const ages = parts.map((p) => p.ageMin ?? 0);
    return {
      ...first,
      id: s.sku,
      slug: s.slug,
      sku: s.sku,
      title: s.title,
      type: "BUNDLE" as const,
      shortDescription: s.shortDescription,
      isbn: null,
      pages: parts.reduce((n, p) => n + (p.pages ?? 0), 0),
      ageMin: Math.min(...ages),
      ageMax: parts.some((p) => p.ageMax == null) ? null : Math.max(...parts.map((p) => p.ageMax ?? 0)),
      pricePaise: paise(s.priceRupees),
      mrpPaise: paise(s.mrpRupees),
      values: [...new Set(parts.flatMap((p) => p.values))],
      featured: false,
      spreads: [],
      components: parts.map((p) => ({ slug: p.slug, quantity: 1 })),
    };
  });

  return { products: [...books, ...bundles], values: VALUES, source: "static" };
}
