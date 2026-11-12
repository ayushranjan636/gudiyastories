import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (SIL Open Font License, see ./fonts/OFL.txt): no request to Google on page load.
const youngSerif = localFont({
  src: "./fonts/young-serif-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

const hankenGrotesk = localFont({
  src: [
    { path: "./fonts/hanken-grotesk-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/hanken-grotesk-latin-wght-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://gudiyastories.com"),
  title: {
    default: "Gudiya Stories",
    template: "%s · Gudiya Stories",
  },
  description:
    "Value-based picture books and mindful colouring books, written and designed by early-years teacher S.V. Bharathi in Tirupati.",
  applicationName: "Gudiya Stories",
  authors: [{ name: "S.V. Bharathi", url: "/about" }],
  creator: "S.V. Bharathi",
  publisher: "Gudiya Stories",
  category: "Books",
  formatDetection: { telephone: false, email: false, address: false },
  // Search engines may show large image previews and full snippets.
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
          ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
        },
      }
    : {}),
  openGraph: { siteName: "Gudiya Stories", locale: "en_IN", type: "website", images: [{ url: "/og-home.jpg", width: 1200, height: 630, alt: "Gudiya Stories picture books and colouring books" }] },
  twitter: { card: "summary_large_image" },
  alternates: { types: { "text/markdown": "/llms.txt" } },
};

export const viewport: Viewport = {
  themeColor: "#FBF8F1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${youngSerif.variable} ${hankenGrotesk.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {children}
        <div aria-hidden="true" className="paper-grain" />
      </body>
    </html>
  );
}
