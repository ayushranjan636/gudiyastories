import type { Metadata } from "next";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Gudiya Stories",
    template: "%s · Gudiya Stories",
  },
  description:
    "Value-based picture books and mindful colouring books, written and designed by early-years teacher S.V. Bharathi in Tirupati.",
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
