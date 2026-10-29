import type { Metadata } from "next";
import { Suspense } from "react";
import { getCatalogue } from "@/features/catalogue/repo";
import { parseFilters } from "@/features/catalogue/filters";
import { BooksBrowser } from "./books-browser";

export const metadata: Metadata = {
  title: "Books",
  description: "Value-based picture books for ages 4 to 13, and mindful colouring books. Choose by value, then by age.",
};

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
      <div className="mt-10">
        <Suspense>
          <BooksBrowser items={items} values={values} initial={parseFilters(sp)} />
        </Suspense>
      </div>
    </div>
  );
}
