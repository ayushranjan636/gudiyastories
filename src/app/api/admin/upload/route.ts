import { currentAdmin } from "@/server/admin";
import { MAX_BYTES, savePublic } from "@/server/storage";

// Admin uploads: the file is the raw request body, so large videos don't hit
// server-action size limits and the browser can report progress.
//   POST /api/admin/upload?folder=classes&only=media   (Content-Type: the file's type)

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ ok: false, message: "Please sign in again." }, { status: 401 });

  const url = new URL(req.url);
  const folder = url.searchParams.get("folder") ?? "uploads";
  const only = (["image", "video", "media"] as const).find((o) => o === url.searchParams.get("only"));
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BYTES.video) return Response.json({ ok: false, message: "That file is over 200 MB." }, { status: 413 });
  if (!req.body) return Response.json({ ok: false, message: "Choose a file first." }, { status: 400 });

  // Read with a hard cap, whatever the header claimed.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = req.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES.video) {
      await reader.cancel();
      return Response.json({ ok: false, message: "That file is over 200 MB." }, { status: 413 });
    }
    chunks.push(value);
  }
  if (!size) return Response.json({ ok: false, message: "That file is empty." }, { status: 400 });

  try {
    const saved = await savePublic(Buffer.concat(chunks), folder, only);
    return Response.json({ ok: true, ...saved });
  } catch (err) {
    return Response.json({ ok: false, message: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }
}
