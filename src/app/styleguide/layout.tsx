import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

// Dev only. In production it 404s unless ENABLE_STYLEGUIDE=true.
export default function StyleguideLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "true") notFound();
  return children;
}
