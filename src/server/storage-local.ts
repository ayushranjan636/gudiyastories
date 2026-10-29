import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./storage";

/** Where uploads live on disk. Outside /public so they work with `next start` and survive rebuilds. */
export function uploadDir() {
  return path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads"));
}

/** Resolves a /uploads/... key to a file path, refusing anything that escapes the folder. */
export function resolveUpload(key: string): string | null {
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*\/[a-z0-9-]+\.[a-z0-9]{2,5}$/i.test(key)) return null;
  const root = uploadDir();
  const full = path.resolve(root, key);
  return full.startsWith(root + path.sep) ? full : null;
}

export function localDriver(): StorageDriver {
  return {
    name: "local",
    async put(key, body) {
      const full = resolveUpload(key);
      if (!full) throw new Error("Invalid file name.");
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, body, { flag: "wx" });
      return `/uploads/${key}`;
    },
  };
}
