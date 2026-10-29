import "server-only";
import { cache } from "react";
import { hasDatabase } from "@/server/env";
import { staticCatalogue } from "./static";
import type { Catalogue, CatalogueProduct } from "./types";

async function databaseCatalogue(): Promise<Catalogue> {
  const { db } = await import("@/server/db");
  const [products, values, stock] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        images: { orderBy: { position: "asc" } },
        spreads: { orderBy: { position: "asc" } },
        values: { include: { value: true } },
        bundleItems: { include: { component: { select: { slug: true, id: true } } } },
        resources: { where: { published: true, isPlaceholder: false, kind: "AFTER_THE_STORY" }, take: 1 },
      },
    }),
    db.value.findMany({ orderBy: { position: "asc" } }),
    db.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } }),
  ]);

  const onHand = new Map(stock.map((s) => [s.productId, s._sum.quantity ?? 0]));

  const mapped: CatalogueProduct[] = products.map((p) => {
    const img = p.images[0];
    const available =
      p.type === "BUNDLE"
        ? p.bundleItems.length
          ? Math.min(...p.bundleItems.map((bi) => Math.floor((onHand.get(bi.component.id) ?? 0) / bi.quantity)))
          : 0
        : (onHand.get(p.id) ?? 0);
    const res = p.resources[0];
    return {
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      title: p.title,
      type: p.type,
      shortDescription: p.shortDescription,
      longDescriptionHtml: p.longDescriptionHtml,
      ageMin: p.ageMin,
      ageMax: p.ageMax,
      pages: p.pages,
      paper: p.paper,
      binding: p.binding,
      isbn: p.isbn,
      publishedOn: p.publishedOn ? p.publishedOn.toISOString().slice(0, 10) : null,
      pricePaise: p.pricePaise,
      mrpPaise: p.mrpPaise,
      spineColor: p.spineColor ?? "#2F6B2A",
      cover: img
        ? { src: img.url, width: img.width ?? 370, height: img.height ?? 493, alt: img.alt }
        : { src: "/brand/gudiya-stories-mark.png", width: 667, height: 490, alt: "" },
      values: p.values.map((v) => v.value.slug),
      goodFor: p.goodFor,
      amazonUrl: p.amazonUrl,
      flipkartUrl: p.flipkartUrl,
      featured: p.featured,
      spreads: p.spreads.map((s) => ({ src: s.url, width: s.width ?? 800, height: s.height ?? 600, alt: s.alt })),
      components: p.bundleItems.map((bi) => ({ slug: bi.component.slug, quantity: bi.quantity })),
      available: Math.max(0, available),
      afterTheStory: res ? { title: res.title, url: `/resources/${res.slug}` } : null,
    };
  });

  // Bundles without their own image borrow the first component's cover.
  const bySlug = new Map(mapped.map((p) => [p.slug, p]));
  for (const p of mapped) {
    if (p.type === "BUNDLE" && p.cover.src.startsWith("/brand/")) {
      const first = p.components[0] && bySlug.get(p.components[0].slug);
      if (first) p.cover = first.cover;
    }
  }

  return {
    products: mapped,
    values: values.map((v) => ({ slug: v.slug, name: v.name, description: v.description })),
    source: "database",
  };
}

/** The live catalogue. Falls back to seed data when no database is configured or reachable. */
export const getCatalogue = cache(async (): Promise<Catalogue> => {
  if (!hasDatabase()) return staticCatalogue();
  try {
    const c = await databaseCatalogue();
    return c.products.length ? c : staticCatalogue();
  } catch (err) {
    console.error("[catalogue] database unavailable, using seed data", err);
    return staticCatalogue();
  }
});

export async function getProduct(slug: string) {
  const c = await getCatalogue();
  return c.products.find((p) => p.slug === slug) ?? null;
}
