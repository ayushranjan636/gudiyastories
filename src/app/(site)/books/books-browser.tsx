"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ValueChips } from "@/components/ui/value-chips";
import { ProductCard } from "@/components/book/product-card";
import { AGE_BUCKETS, SORTS, TYPES, applyFilters, type FilterState } from "@/features/catalogue/filters";
import type { CatalogueProduct, CatalogueValue } from "@/features/catalogue/types";
import { EASE } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

type Item = CatalogueProduct & { valueNames: string[]; componentCovers: CatalogueProduct["cover"][] };

function Pills({
  legend,
  options,
  selected,
  onChange,
  name,
}: {
  legend: string;
  options: readonly { slug: string; label: string }[];
  selected: string | null;
  onChange: (v: string | null) => void;
  name: string;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="mr-2 mb-2 text-small text-ink-soft sm:float-left sm:mb-0">{legend}</legend>
      {[{ slug: "", label: "Any" }, ...options].map((o) => {
        const on = (selected ?? "") === o.slug;
        return (
          <label
            key={o.slug || "any"}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center rounded-full border px-3.5 text-small transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf",
              on ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/40",
            )}
          >
            <input type="radio" name={name} className="sr-only" checked={on} onChange={() => onChange(o.slug || null)} />
            {o.label}
          </label>
        );
      })}
    </fieldset>
  );
}

export function BooksBrowser({ items, values, initial }: { items: Item[]; values: CatalogueValue[]; initial: FilterState }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const reduce = useReducedMotion();

  const state: FilterState = {
    value: params.get("value") ?? initial.value,
    age: params.get("age") ?? initial.age,
    type: params.get("type") ?? initial.type,
    sort: params.get("sort") ?? initial.sort,
  };
  // URL is the source of truth; the server-provided initial state covers the first paint.
  if (params.size === 0) Object.assign(state, { value: null, age: null, type: null, sort: "recommended" });

  const results = useMemo(() => applyFilters(items, state), [items, state.value, state.age, state.type, state.sort]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(key: keyof FilterState, v: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!v || (key === "sort" && v === "recommended")) next.delete(key);
    else next.set(key, v);
    const q = next.toString();
    startTransition(() => router.replace((q ? `${pathname}?${q}` : pathname) as "/books", { scroll: false }));
  }

  const activeValue = values.find((v) => v.slug === state.value);

  return (
    <div>
      <div className="space-y-5 border-y border-line py-6">
        <ValueChips
          options={values.map((v) => ({ slug: v.slug, name: v.name }))}
          selected={state.value}
          onChange={(v) => set("value", v)}
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-8">
            <Pills legend="Age" name="age" options={AGE_BUCKETS} selected={state.age} onChange={(v) => set("age", v)} />
            <Pills legend="Type" name="type" options={TYPES} selected={state.type} onChange={(v) => set("type", v)} />
          </div>
          <label className="flex items-center gap-3 text-small">
            <span className="text-ink-soft">Sort</span>
            <select
              value={state.sort}
              onChange={(e) => set("sort", e.target.value)}
              className="h-9 rounded-full border border-line bg-transparent px-3 text-small"
            >
              {SORTS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-4 py-6" aria-live="polite">
        <p className="text-ink-soft">
          {results.length} {results.length === 1 ? "title" : "titles"}
          {activeValue ? (
            <>
              {" "}
              for <span className="text-ink">{activeValue.name.toLowerCase()}</span>. {activeValue.description}
            </>
          ) : null}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-h3">No book matches all of those yet.</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-ink-soft">
            Try a wider age range, or take one filter off. The value you picked usually has a book one age band up or down.
          </p>
          <button
            type="button"
            onClick={() => startTransition(() => router.replace("/books", { scroll: false }))}
            className="mt-6 font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <LayoutGroup>
          <motion.ul layout={!reduce} className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence initial={false} mode="popLayout">
              {results.map((p, i) => (
                <motion.li
                  key={p.slug}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <ProductCard p={p} priority={i < 4} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </LayoutGroup>
      )}
    </div>
  );
}
