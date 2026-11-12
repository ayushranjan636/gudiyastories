import type { Metadata } from "next";
import { NotFoundBody } from "@/components/site/not-found-body";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return <NotFoundBody />;
}
