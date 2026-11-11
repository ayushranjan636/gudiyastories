import { ArrowUpRight } from "lucide-react";
import { storeLinks } from "@/content/marketplaces";

/** "Also on Flipkart · Mystore": for families who prefer to order through a marketplace. */
export function AlsoOn({ product, className }: { product: { slug: string; amazonUrl?: string | null; flipkartUrl?: string | null }; className?: string }) {
  const links = storeLinks(product);
  if (!links.length) return null;
  return (
    <div className={className}>
      <p className="text-small text-ink-soft">Prefer a marketplace? Also sold by Gudiya Stories on</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.name}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-small transition-colors hover:border-ink hover:text-leaf"
            >
              {l.name}
              <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
