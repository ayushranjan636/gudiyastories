import { getCatalogue } from "@/features/catalogue/repo";
import { toSummary } from "@/features/catalogue/types";
import { BagProvider } from "@/features/bag/bag-context";
import { BagDrawer } from "@/features/bag/bag-drawer";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { InstagramSection } from "@/components/site/instagram-section";
import { PageViewTracker } from "@/features/analytics/page-view-tracker";
import { ButterflyGuide } from "@/components/motion/butterfly-guide";
import { NavigationProgress } from "@/components/motion/navigation-progress";
import { Suspense } from "react";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/config/site";
import { getShippingRules } from "@/server/settings";

/** Header, footer, bag and analytics around every public page. */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [catalogue, rules] = await Promise.all([getCatalogue(), getShippingRules()]);
  return (
    <BagProvider products={catalogue.products.map(toSummary)} shipping={{ flatPaise: rules.flatRatePaise, freeFromPaise: rules.freeFromPaise }}>
      <Suspense>
        <NavigationProgress />
      </Suspense>
      <SiteHeader />
      <main id="main">{children}</main>
      <InstagramSection />
      <SiteFooter />
      <BagDrawer />
      <PageViewTracker />
      <ButterflyGuide />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          url: SITE.url,
          logo: `${SITE.url}/brand/gudiya-stories-lockup.png`,
          email: SITE.email,
          telephone: SITE.phoneE164,
          address: { "@type": "PostalAddress", addressLocality: SITE.city, addressRegion: SITE.region, addressCountry: "IN" },
          founder: { "@type": "Person", name: SITE.author },
          sameAs: [SITE.instagram],
        }}
      />
    </BagProvider>
  );
}
