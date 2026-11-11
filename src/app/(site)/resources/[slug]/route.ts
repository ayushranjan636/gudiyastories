import { createHash } from "node:crypto";
import { hasDatabase } from "@/server/env";

/** Counts a download, then sends the visitor to the file. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!hasDatabase()) return new Response("Not found", { status: 404 });
  const { db } = await import("@/server/db");
  const r = await db.resource.findUnique({ where: { slug } });
  if (!r || !r.published || r.isPlaceholder) return new Response("Not found", { status: 404 });

  const ua = req.headers.get("user-agent") ?? "";
  const { clientIp, rateLimit } = await import("@/server/rate-limit");
  const ip = clientIp(req.headers);
  // Downloads are counted; don't let a script inflate the numbers.
  if (!(await rateLimit(`download:${createHash("sha256").update(ip).digest("hex").slice(0, 24)}`, 60, 3600))) {
    return Response.redirect(new URL(r.fileUrl, req.url), 302);
  }
  const day = new Date().toISOString().slice(0, 10);
  const sessionId = createHash("sha256").update(`${process.env.ANALYTICS_SALT_SECRET ?? "gudiya"}:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);
  await db.resourceDownload.create({ data: { resourceId: r.id, sessionId } }).catch(() => {});
  await db.analyticsEvent
    .create({ data: { type: "resource_download", sessionId, path: `/resources/${slug}`, productId: r.productId } })
    .catch(() => {});

  return Response.redirect(new URL(r.fileUrl, req.url), 302);
}
