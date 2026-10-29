import type { Metadata } from "next";
import { hasDatabase } from "@/server/env";
import { SITE } from "@/config/site";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Track an order", robots: { index: false } };

export default function TrackPage() {
  return (
    <div className="content-grid pt-10 md:pt-16">
      <h1 className="text-h2">Track an order</h1>
      <p className="mt-3 max-w-[52ch] text-ink-soft">Enter the order number from your confirmation and the mobile number you ordered with.</p>
      {hasDatabase() ? (
        <TrackForm />
      ) : (
        <p className="mt-8 text-ink-soft">For order updates, message us on WhatsApp at {SITE.phoneDisplay}.</p>
      )}
    </div>
  );
}
