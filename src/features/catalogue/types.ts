export type ProductKind = "STORY" | "COLOURING" | "BUNDLE";

export type CatalogueImage = { src: string; width: number; height: number; alt: string };

export type CatalogueValue = { slug: string; name: string; description: string };

export type CatalogueProduct = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  type: ProductKind;
  shortDescription: string;
  longDescriptionHtml: string | null;
  ageMin: number | null;
  ageMax: number | null;
  pages: number | null;
  paper: string | null;
  binding: string | null;
  isbn: string | null;
  publishedOn: string | null; // ISO date
  pricePaise: number;
  mrpPaise: number;
  spineColor: string;
  cover: CatalogueImage;
  values: string[];
  goodFor: string[];
  amazonUrl: string | null;
  flipkartUrl: string | null;
  featured: boolean;
  spreads: CatalogueImage[];
  /** Bundle contents, by product slug. Empty for single books. */
  components: { slug: string; quantity: number }[];
  /** Units available to sell. null = stock is not tracked yet (no database). */
  available: number | null;
  afterTheStory: { title: string; url: string } | null;
};

export type Catalogue = {
  products: CatalogueProduct[];
  values: CatalogueValue[];
  source: "database" | "static";
};

/** A lighter shape for client components (bag, filters). */
export type ProductSummary = Pick<
  CatalogueProduct,
  "slug" | "sku" | "title" | "type" | "pricePaise" | "mrpPaise" | "cover" | "spineColor" | "ageMin" | "ageMax" | "values" | "pages" | "available"
>;

export function toSummary(p: CatalogueProduct): ProductSummary {
  return {
    slug: p.slug,
    sku: p.sku,
    title: p.title,
    type: p.type,
    pricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise,
    cover: p.cover,
    spineColor: p.spineColor,
    ageMin: p.ageMin,
    ageMax: p.ageMax,
    values: p.values,
    pages: p.pages,
    available: p.available,
  };
}
