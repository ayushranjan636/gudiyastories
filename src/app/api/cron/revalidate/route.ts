import { revalidatePath } from "next/cache";

/**
 * Called once by the deploy (deploy/server/release.sh) right after a new version
 * starts. Pages pre-built on the build machine used the built-in catalogue (it has
 * no database); this marks every page stale, so each one is rebuilt from the live
 * database on its next visit. Call with: Authorization: Bearer CRON_SECRET
 */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}
