import "server-only";
import { cache } from "react";
import { hasDatabase } from "@/server/env";

export type PublicClass = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  aboutHtml: string;
  topics: string[];
  audience: string | null;
  mode: string | null;
  schedule: string | null;
  startDate: Date | null;
  duration: string;
  pricePaise: number | null;
  priceNote: string | null;
  enquiryUrl: string;
  mediaKind: "IMAGE" | "VIDEO" | "YOUTUBE" | null;
  mediaUrl: string | null;
  posterUrl: string | null;
  mediaAlt: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  isPopup: boolean;
  updatedAt: Date;
};

const SELECT = {
  id: true, slug: true, title: true, summary: true, aboutHtml: true, topics: true, audience: true, mode: true, schedule: true,
  startDate: true, duration: true, pricePaise: true, priceNote: true, enquiryUrl: true, mediaKind: true, mediaUrl: true,
  posterUrl: true, mediaAlt: true, status: true, isPopup: true, updatedAt: true,
} as const;

/** Open classes first (soonest start first, undated after), then closed ones. */
export const getClasses = cache(async (): Promise<PublicClass[]> => {
  if (!hasDatabase()) return [];
  try {
    const { db } = await import("@/server/db");
    const rows = await db.onlineClass.findMany({
      where: { status: { in: ["PUBLISHED", "CLOSED"] } },
      select: SELECT,
      orderBy: [{ sortOrder: "asc" }, { startDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    });
    return rows.sort((a, b) => Number(a.status === "CLOSED") - Number(b.status === "CLOSED"));
  } catch (err) {
    console.error("[classes] database unavailable", err);
    return [];
  }
});

export async function getClass(slug: string, allowDraft = false): Promise<PublicClass | null> {
  if (!hasDatabase()) return null;
  const { db } = await import("@/server/db");
  const c = await db.onlineClass.findUnique({ where: { slug }, select: SELECT });
  if (!c || (c.status === "DRAFT" && !allowDraft)) return null;
  return c;
}

/** The one class chosen for the home-page pop-up, if it's open for enquiries. */
export const getPopupClass = cache(async (): Promise<PublicClass | null> => {
  if (!hasDatabase()) return null;
  try {
    const { db } = await import("@/server/db");
    return await db.onlineClass.findFirst({ where: { isPopup: true, status: "PUBLISHED" }, select: SELECT });
  } catch {
    return null;
  }
});
