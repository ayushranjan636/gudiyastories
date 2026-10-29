import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * File uploads (book covers, blog images, PDFs).
 *
 *   STORAGE_DRIVER=local  (default) files go to UPLOAD_DIR on this server's disk
 *                         and are served at /uploads/...
 *   STORAGE_DRIVER=s3     files go to an S3 bucket (AWS). See docs/STORAGE.md.
 *
 * Every driver returns a URL that is stored in the database as-is, so moving
 * from local to S3 later only affects new uploads; old ones keep working as
 * long as the old files are copied across (docs/STORAGE.md has the command).
 */

export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const MB = 1024 * 1024;
/** Images and PDFs up to 15 MB, videos up to 200 MB. */
export const MAX_BYTES = { file: 15 * MB, video: 200 * MB };
export const maxBytesFor = (type: string) => (type.startsWith("video/") ? MAX_BYTES.video : MAX_BYTES.file);

export type StorageDriver = {
  name: string;
  put(key: string, body: Buffer, contentType: string): Promise<string>;
};

export function storageDriverName() {
  return (process.env.STORAGE_DRIVER || "local").toLowerCase();
}

/** Uploads are always available: local disk needs no setup. */
export function hasStorage() {
  return true;
}

async function driver(): Promise<StorageDriver> {
  const name = storageDriverName();
  if (name === "s3") return (await import("./storage-s3")).s3Driver();
  if (name === "local") {
    if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
      throw new Error('Uploads need Cloudflare R2 on this host (it has no lasting disk). Set STORAGE_DRIVER="s3" and the R2 settings (docs/DEPLOY-NETLIFY.md).');
    }
    return (await import("./storage-local")).localDriver();
  }
  throw new Error(`Unknown STORAGE_DRIVER "${name}". Use "local" or "s3".`);
}

/** Checks the file by its actual bytes, not just the name the browser sent. */
export function sniffType(buf: Buffer): string | null {
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("52494646") && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  const box = buf.subarray(4, 12).toString("latin1");
  if (/^ftypavi[fs]/.test(box)) return "image/avif";
  if (/^ftypqt {2}/.test(box)) return "video/quicktime";
  if (/^ftyp(isom|iso[2-9]|mp4[12]|M4V |avc1|dash|mmp4|MSNV|3gp)/.test(box)) return "video/mp4";
  if (hex.startsWith("1a45dfa3")) return "video/webm";
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}

export function safeFolder(folder: string) {
  return folder.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32) || "uploads";
}

export type UploadKind = "image" | "video" | "media";

/** Throws a friendly error if this type or size isn't allowed here. */
function checkFile(type: string | null, size: number, only?: UploadKind): asserts type is string {
  if (!type || !ALLOWED_TYPES[type]) throw new Error("Use a JPG, PNG, WebP, AVIF or PDF file, or an MP4, WebM or MOV video. (iPhone HEIC photos: share them as JPG first.)");
  if (only === "image" && !type.startsWith("image/")) throw new Error("Use a JPG, PNG, WebP or AVIF image here.");
  if (only === "video" && !type.startsWith("video/")) throw new Error("Use an MP4, WebM or MOV video here.");
  if (only === "media" && !type.startsWith("image/") && !type.startsWith("video/")) throw new Error("Use an image or a video here.");
  if (size > maxBytesFor(type)) {
    throw new Error(type.startsWith("video/") ? "That video is over 200 MB. Shorten it or upload it to YouTube and paste the link." : "That file is over 15 MB. Please resize it first.");
  }
}

const newKey = (folder: string, type: string) => `${safeFolder(folder)}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ALLOWED_TYPES[type]}`;

/** Saves a public file and returns its URL and type. Checks size and the real file type. */
export async function savePublic(body: Buffer, folder: string, only?: UploadKind): Promise<{ url: string; type: string }> {
  const type = sniffType(body);
  checkFile(type, body.length, only);
  return { url: await (await driver()).put(newKey(folder, type), body, type), type };
}

/**
 * Direct uploads (S3 / Cloudflare R2): the browser sends the file straight to
 * the bucket, so large videos never pass through the site. That matters on
 * hosts like Netlify, where a request to the site can carry only a few MB.
 *
 *   1. startDirectUpload: checks the declared type and size, returns a signed PUT address.
 *   2. the browser PUTs the file there.
 *   3. finishDirectUpload: reads the object's real size and first bytes; anything
 *      that isn't what was declared (or isn't allowed) is deleted again.
 */
export function directUploads() {
  return storageDriverName() === "s3";
}

function uploadToken(key: string, type: string, only: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return createHmac("sha256", `gudiya:upload:${secret}`).update(`${key}|${type}|${only}`).digest("base64url");
}

export async function startDirectUpload(input: { folder: string; type: string; size: number; only?: UploadKind }) {
  checkFile(input.type, input.size, input.only);
  const key = newKey(input.folder, input.type);
  const { presignPut } = await import("./storage-s3");
  const put = await presignPut(key, input.type);
  return { key, uploadUrl: put.url, headers: put.headers, token: uploadToken(key, input.type, input.only ?? "") };
}

export async function finishDirectUpload(input: { key: string; type: string; only?: UploadKind; token: string }): Promise<{ url: string; type: string }> {
  const expected = Buffer.from(uploadToken(input.key, input.type, input.only ?? ""));
  const given = Buffer.from(input.token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new Error("This upload could not be confirmed. Please try again.");
  const { inspectObject, deleteObject, s3Config } = await import("./storage-s3");
  const obj = await inspectObject(input.key);
  if (!obj || !obj.size) throw new Error("The file didn't arrive. Please try again.");
  const real = sniffType(obj.head);
  try {
    checkFile(real, obj.size, input.only);
    const family = (t: string) => t.split("/")[0];
    if (family(real) !== family(input.type)) throw new Error("That file isn't what its name says. Please export it again as JPG, PNG, WebP, PDF or MP4.");
  } catch (err) {
    await deleteObject(input.key);
    throw err;
  }
  return { url: `${s3Config().publicBase}/${input.key.split("/").map(encodeURIComponent).join("/")}`, type: real };
}

/** Same, from a browser File (server actions). */
export async function uploadPublic(file: File, folder: string): Promise<string> {
  if (file.size > MAX_BYTES.video) throw new Error("That file is too large.");
  return (await savePublic(Buffer.from(await file.arrayBuffer()), folder)).url;
}
