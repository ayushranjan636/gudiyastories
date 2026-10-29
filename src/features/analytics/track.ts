"use client";

export type TrackEvent =
  | "page_view"
  | "product_view"
  | "add_to_bag"
  | "checkout_started"
  | "whatsapp_click"
  | "resource_download"
  | "enquiry_submitted"
  | "look_inside_opened"
  | "class_enquiry";

type TrackProps = { productSlug?: string; valuePaise?: number; meta?: Record<string, string | number | boolean> };

/**
 * Cookie-free, first-party analytics. Sends a beacon to /api/events.
 * The server derives the session from a daily salted hash; nothing is stored in the browser.
 */
export function track(type: TrackEvent, props: TrackProps = {}) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      type,
      path: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer || null,
      ...props,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    /* analytics must never break the page */
  }
}
