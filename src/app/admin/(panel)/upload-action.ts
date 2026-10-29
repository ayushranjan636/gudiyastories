"use server";

import { requireAdmin } from "@/server/admin";
import { uploadPublic } from "@/server/storage";

export async function uploadFile(form: FormData): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  await requireAdmin();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "uploads");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose a file first." };
  try {
    return { ok: true, url: await uploadPublic(file, folder) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Upload failed." };
  }
}
