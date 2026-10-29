import "server-only";
import { hasDatabase } from "@/server/env";
import { getCatalogue } from "@/features/catalogue/repo";

export async function getPublishedResources() {
  if (!hasDatabase()) return [];
  try {
    const { db } = await import("@/server/db");
    const [rows, { products }] = await Promise.all([
      db.resource.findMany({ where: { published: true, isPlaceholder: false }, orderBy: { createdAt: "desc" } }),
      getCatalogue(),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, product: r.productId ? byId.get(r.productId) ?? null : null }));
  } catch {
    return [];
  }
}
