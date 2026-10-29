import { hasDatabase } from "@/server/env";

export const dynamic = "force-dynamic";

/**
 * Health check for uptime monitors and the deploy script:
 *   GET /api/health  → 200 {"ok":true,...} when the site and database answer, 503 otherwise.
 * Shows nothing private.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "down" | "not configured" = "not configured";
  if (hasDatabase()) {
    try {
      const { db } = await import("@/server/db");
      await db.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "down";
    }
  }
  const ok = database !== "down";
  return Response.json(
    { ok, database, uptimeSeconds: Math.round(process.uptime()), ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
