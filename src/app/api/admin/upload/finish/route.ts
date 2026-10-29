import { z } from "zod";
import { currentAdmin } from "@/server/admin";
import { finishDirectUpload } from "@/server/storage";

// Step 3 of a direct upload: the file is in the bucket; check it really is what was declared.
export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ ok: false, message: "Please sign in again." }, { status: 401 });
  const p = z
    .object({ key: z.string().max(200), type: z.string().max(100), token: z.string().max(100), only: z.enum(["image", "video", "media"]).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ ok: false, message: "Upload failed." }, { status: 400 });
  try {
    return Response.json({ ok: true, ...(await finishDirectUpload(p.data)) });
  } catch (err) {
    return Response.json({ ok: false, message: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }
}
