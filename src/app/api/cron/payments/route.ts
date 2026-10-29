import { hasDatabase } from "@/server/env";

/**
 * Checks every open Razorpay payment with Razorpay and expires stale unpaid
 * orders. The server already runs this every two minutes by itself
 * (src/instrumentation.ts); this address is for an outside scheduler too,
 * e.g. AWS EventBridge when running several servers or serverless.
 * Call with: Authorization: Bearer CRON_SECRET
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasDatabase()) return Response.json({ skipped: true });
  const { reconcilePending } = await import("@/features/payments/reconcile");
  return Response.json(await reconcilePending({ budgetMs: 6_000 }));
}
