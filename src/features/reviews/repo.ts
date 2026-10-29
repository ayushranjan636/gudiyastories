import "server-only";
import { hasDatabase } from "@/server/env";

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  displayName: string;
  reply: string | null;
  createdAt: Date;
};

/** Only approved reviews, which can only exist for verified purchases. */
export async function getApprovedReviews(productId: string): Promise<PublicReview[]> {
  if (!hasDatabase()) return [];
  try {
    const { db } = await import("@/server/db");
    return await db.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, rating: true, title: true, body: true, displayName: true, reply: true, createdAt: true },
    });
  } catch {
    return [];
  }
}
