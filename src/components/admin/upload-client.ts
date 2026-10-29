"use client";

export type Uploaded = { url: string; type: string };
type Only = "image" | "video" | "media";

async function postJson<T>(url: string, body: unknown): Promise<T & { ok: boolean; message?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ ok: false, message: `Upload failed (${res.status}).` }));
}

/** Sends a file with progress. Resolves with the response text. */
function send(method: "POST" | "PUT", url: string, file: File, headers: Record<string, string>, onProgress?: (p: number) => void) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}

/**
 * Uploads one file, reporting progress from 0 to 1.
 * With S3 / Cloudflare R2 storage the file goes straight to the bucket (no size
 * limit from the host); with local storage it goes through /api/admin/upload.
 */
export async function uploadMedia(file: File, folder: string, opts: { only?: Only; onProgress?: (p: number) => void } = {}): Promise<Uploaded> {
  const type = file.type || "application/octet-stream";
  const start = await postJson<{ direct?: boolean; key?: string; uploadUrl?: string; headers?: Record<string, string>; token?: string }>(
    "/api/admin/upload/start",
    { folder, type, size: file.size, only: opts.only },
  );
  if (!start.ok) throw new Error(start.message ?? "Upload failed.");

  if (start.direct && start.uploadUrl && start.key && start.token) {
    const put = await send("PUT", start.uploadUrl, file, start.headers ?? {}, opts.onProgress);
    if (put.status < 200 || put.status >= 300) throw new Error(`Upload to storage failed (${put.status}). If this keeps happening, check the bucket's CORS rule (docs/STORAGE.md).`);
    const done = await postJson<{ url?: string; type?: string }>("/api/admin/upload/finish", { key: start.key, type, token: start.token, only: opts.only });
    if (!done.ok || !done.url) throw new Error(done.message ?? "Upload failed.");
    return { url: done.url, type: done.type ?? type };
  }

  const q = new URLSearchParams({ folder, ...(opts.only ? { only: opts.only } : {}) });
  const r = await send("POST", `/api/admin/upload?${q}`, file, { "Content-Type": type }, opts.onProgress);
  let body: { ok?: boolean; url?: string; type?: string; message?: string } = {};
  try {
    body = JSON.parse(r.text);
  } catch {
    /* not JSON */
  }
  if (r.status >= 200 && r.status < 300 && body.ok && body.url) return { url: body.url, type: body.type ?? type };
  throw new Error(body.message ?? (r.status === 413 ? "That file is too large." : `Upload failed (${r.status}).`));
}

export const isVideoUrl = (u: string) => /\.(mp4|webm|mov)(\?|$)/i.test(u);

export function youtubeId(url: string) {
  return url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1] ?? null;
}
