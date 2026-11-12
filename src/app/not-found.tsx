import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { NotFoundBody } from "@/components/site/not-found-body";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

// For addresses that match no page at all: same header and footer as the site.
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundBody />
    </SiteShell>
  );
}
