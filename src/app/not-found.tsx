import { SiteShell } from "@/components/site/site-shell";
import { NotFoundBody } from "@/components/site/not-found-body";

// For addresses that match no page at all: same header and footer as the site.
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundBody />
    </SiteShell>
  );
}
