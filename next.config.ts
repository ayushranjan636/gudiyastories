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

const securityHeaders = [
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
  typedRoutes: true,
  poweredByHeader: false,
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
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
