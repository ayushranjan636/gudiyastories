import type { NextConfig } from "next";

// Images uploaded in the admin are served from /uploads (local disk) or, on AWS,
// from S3_PUBLIC_URL (CloudFront) or the bucket. next/image needs to know the host.
function hostOf(url: string | undefined) {
  try {
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined; // tolerate empty or placeholder values in .env
  }
}
const s3Host =
  hostOf(process.env.S3_PUBLIC_URL) ??
  hostOf(process.env.S3_ENDPOINT) ??
  (process.env.S3_BUCKET ? `${process.env.S3_BUCKET}.s3.${process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1"}.amazonaws.com` : undefined);

// Where the browser may load things from. Anything else (an injected script, a
// form posting to another site, the site being framed) is blocked by the browser.
const mediaHost = s3Host ? `https://${s3Host}` : "";
// Google Analytics 4 is allowed only when a measurement ID is configured.
const ga = /^G-[A-Z0-9]{4,20}$/.test((process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim());
const gaScript = ga ? " https://www.googletagmanager.com" : "";
const gaConnect = ga ? " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com" : "";
const gaImg = ga ? " https://*.google-analytics.com https://www.googletagmanager.com" : "";
const csp = [
  "default-src 'self'",
  // Next.js needs inline scripts for page data; Razorpay and Instagram load their own.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://checkout.razorpay.com https://www.instagram.com https://static.cloudflareinsights.com${gaScript}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://i.ytimg.com https://*.razorpay.com https://*.cdninstagram.com https://www.instagram.com${gaImg} ${mediaHost}`.trim(),
  `media-src 'self' blob: ${mediaHost}`.trim(),
  "font-src 'self' data:",
  // Browser uploads go straight to the bucket; Razorpay's window talks to its API.
  // cloudflareinsights.com: Cloudflare Web Analytics (cookie-free, real-visitor Core Web Vitals).
  `connect-src 'self' https://*.razorpay.com https://cloudflareinsights.com${gaConnect} ${mediaHost} ${hostOf(process.env.S3_ENDPOINT) ? `https://${hostOf(process.env.S3_ENDPOINT)}` : ""}`.replace(/\s+/g, " ").trim(),
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.youtube-nocookie.com https://www.youtube.com https://www.instagram.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HTTPS only, for two years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Reverse proxies (e.g. nginx): pass streamed pages (loading states) straight through.
  { key: "X-Accel-Buffering", value: "no" },
];

const nextConfig: NextConfig = {
  // Deploy builds (GitHub Actions) go to .next-deploy; local dev keeps .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // A new id per deploy (the git commit, set by GitHub Actions). Pages open in a
  // browser from the previous version then reload themselves instead of calling
  // server code that no longer exists ("Failed to find Server Action").
  ...(process.env.NEXT_DEPLOYMENT_ID ? { deploymentId: process.env.NEXT_DEPLOYMENT_ID } : {}),
  typedRoutes: true,
  poweredByHeader: false,
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Private order pages: the private link must never leak to other sites (Referer),
      // and no browser, proxy or Cloudflare may keep a copy.
      ...["/receipt/:path*", "/order/:path*", "/review/:path*", "/track"].map((source) => ({
        source,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      })),
      // Pictures and videos in /public: browsers keep them for a month. A changed file
      // should get a new name (or wait a month) — the pages themselves are never cached this long.
      {
        source: "/:dir(books|brand|readers|gallery|recognition|sets|authors|videos|resources)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      { source: "/og-home.jpg", headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }] },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(s3Host ? [{ protocol: "https" as const, hostname: s3Host }] : []),
      // Still pictures for YouTube videos in blog posts and classes.
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/notes", destination: "/blog", permanent: true },
      { source: "/notes/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/admin/notes", destination: "/admin/blog", permanent: false },
      { source: "/admin/notes/:path*", destination: "/admin/blog/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
