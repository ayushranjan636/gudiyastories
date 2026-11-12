import Link from "next/link";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/config/site";
import { cn } from "@/lib/cn";

export type Crumb = { name: string; href: string };

/**
 * Visible breadcrumb trail plus matching BreadcrumbList structured data.
 * "Home" is added first; the last crumb is the current page (not a link).
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const base = SITE.url.replace(/\/$/, "");
  const trail: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-small text-ink-soft", className)}>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-2">
                {last ? (
                  <span aria-current="page" className="text-ink">
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link href={c.href as "/"} className="hover:text-ink">
                      {c.name}
                    </Link>
                    <span aria-hidden="true">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: `${base}${c.href === "/" ? "/" : c.href}`,
          })),
        }}
      />
    </>
  );
}
