"use client";

import type { ReactNode } from "react";
import { track } from "@/features/analytics/track";

/** Opens a class's Google Form in a new tab and counts the click (Admin → Analytics). */
export function EnquireLink({ href, slug, from, className, children }: { href: string; slug: string; from: "card" | "page" | "popup" | "bar"; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => track("class_enquiry", { meta: { class: slug, from } })}>
      {children}
    </a>
  );
}
