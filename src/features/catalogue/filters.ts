export const AGE_BUCKETS = [
  { slug: "4-6", label: "4–6", lo: 4, hi: 6 },
  { slug: "6-8", label: "6–8", lo: 6, hi: 8 },
  { slug: "8-10", label: "8–10", lo: 8, hi: 10 },
  { slug: "10-plus", label: "10+", lo: 10, hi: 99 },
] as const;

export const TYPES = [
  { slug: "story", label: "Stories", type: "STORY" },
  { slug: "colouring", label: "Colouring", type: "COLOURING" },
  { slug: "sets", label: "Sets", type: "BUNDLE" },
] as const;

export const SORTS = [
  { slug: "recommended", label: "Recommended" },
  { slug: "price-asc", label: "Price, low to high" },
  { slug: "price-desc", label: "Price, high to low" },
  { slug: "newest", label: "Newest" },
] as const;

type Filterable = {
  type: string;
  values: string[];
  ageMin: number | null;
  ageMax: number | null;
  pricePaise: number;
  publishedOn?: string | null;
};

export type FilterState = { value: string | null; age: string | null; type: string | null; sort: string };

export function parseFilters(sp: Record<string, string | string[] | undefined>): FilterState {
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v.length < 40 ? v : null;
  };
  return { value: one("value"), age: one("age"), type: one("type"), sort: one("sort") ?? "recommended" };
}

export function applyFilters<T extends Filterable>(items: T[], f: FilterState): T[] {
  const bucket = AGE_BUCKETS.find((b) => b.slug === f.age);
  const type = TYPES.find((t) => t.slug === f.type)?.type;
  const out = items.filter((p) => {
    if (f.value && !p.values.includes(f.value)) return false;
    if (type && p.type !== type) return false;
    if (bucket) {
      const lo = p.ageMin ?? 0;
      const hi = p.ageMax ?? 99;
      if (hi < bucket.lo || lo > bucket.hi) return false;
    }
    return true;
  });
  if (f.sort === "price-asc") out.sort((a, b) => a.pricePaise - b.pricePaise);
  if (f.sort === "price-desc") out.sort((a, b) => b.pricePaise - a.pricePaise);
  if (f.sort === "newest") out.sort((a, b) => (b.publishedOn ?? "").localeCompare(a.publishedOn ?? ""));
  return out;
}
