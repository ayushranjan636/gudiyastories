import Script from "next/script";

/**
 * Google Analytics 4, loaded only when NEXT_PUBLIC_GA_MEASUREMENT_ID (e.g. G-ABC123XYZ)
 * is set at build time. Public pages only (not admin, checkout scripts unaffected).
 *
 * - Loads after the page is interactive, so it doesn't slow the first paint.
 * - Advertising storage and ad personalisation are denied by default: this is
 *   for measuring visits, not ads. Page changes inside the app are counted by
 *   GA4's own "page changes based on browser history" (on by default).
 * - The site's own cookie-free counter keeps running alongside; it does not
 *   report to Google.
 */
export const GA_ID = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim();
const VALID = /^G-[A-Z0-9]{4,20}$/.test(GA_ID);

export function GoogleAnalytics() {
  if (!VALID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());
gtag('config','${GA_ID}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
