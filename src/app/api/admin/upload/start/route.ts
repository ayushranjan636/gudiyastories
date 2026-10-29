import { z } from "zod";
import { currentAdmin } from "@/server/admin";
import { directUploads, startDirectUpload } from "@/server/storage";

// Step 1 of a direct upload: POST { folder, type, size, only? } → where to PUT the file.
// With local storage it answers { direct: false } and the browser uses /api/admin/upload instead.
export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ ok: false, message: "Please sign in again." }, { status: 401 });
  if (!directUploads()) return Response.json({ ok: true, direct: false });
  const p = z
    .object({ folder: z.string().max(40), type: z.string().max(100), size: z.number().int().positive(), only: z.enum(["image", "video", "media"]).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ ok: false, message: "Choose a file first." }, { status: 400 });
  try {
    return Response.json({ ok: true, direct: true, ...(await startDirectUpload(p.data)) });
  } catch (err) {
    return Response.json({ ok: false, message: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }
}
