import fs from "node:fs";
import { Readable } from "node:stream";
import { resolveUpload } from "@/server/storage-local";

// Serves files saved by the local storage driver (STORAGE_DRIVER=local).
// File names are random and never reused, so browsers may cache them for a year.
// Supports Range requests, which browsers need to play and seek videos.

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

async function serve(req: Request, params: Promise<{ path: string[] }>, head: boolean) {
  const key = (await params).path.join("/");
  const file = resolveUpload(key);
  const type = TYPES[key.split(".").pop()!.toLowerCase()];
  if (!file || !type) return new Response("Not found", { status: 404 });
  let size: number;
  try {
    const st = await fs.promises.stat(file);
    if (!st.isFile()) throw new Error();
    size = st.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const base: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    let start = range[1] ? Number(range[1]) : NaN;
    let end = range[2] ? Number(range[2]) : size - 1;
    if (Number.isNaN(start)) {
      start = Math.max(0, size - end); // "bytes=-500": the last 500 bytes
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${size}` } });
    const headers = { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) };
    if (head) return new Response(null, { status: 206, headers });
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  const headers = { ...base, "Content-Length": String(size) };
  if (head) return new Response(null, { headers });
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { headers });
}

export function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return serve(req, params, false);
}

export function HEAD(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return serve(req, params, true);
}
