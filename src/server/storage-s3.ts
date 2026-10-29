import "server-only";
import { createHash, createHmac } from "node:crypto";
import type { StorageDriver } from "./storage";

/**
 * Amazon S3 uploads with no extra packages: requests are signed with AWS
 * Signature Version 4 directly.
 *
 * Credentials, in order:
 *   1. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (/ AWS_SESSION_TOKEN) in .env
 *   2. the task role on ECS / App Runner
 *   3. the instance role on EC2 (IMDSv2)
 * so on AWS you can attach a role and leave the keys out entirely.
 */

type Creds = { accessKeyId: string; secretAccessKey: string; sessionToken?: string; expires?: number };

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();
const encodeKey = (key: string) => key.split("/").map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");

/** Signs one request. Exported for tests (checked against AWS's published example). */
export function signV4(input: {
  method: string;
  host: string;
  path: string;
  query?: string;
  headers: Record<string, string>;
  payloadHash: string;
  region: string;
  service?: string;
  amzDate: string;
  creds: Creds;
}) {
  const service = input.service ?? "s3";
  const date = input.amzDate.slice(0, 8);
  const headers: Record<string, string> = { host: input.host };
  for (const [k, v] of Object.entries(input.headers)) headers[k.toLowerCase()] = String(v).trim().replace(/\s+/g, " ");
  const names = Object.keys(headers).sort();
  const canonical = [
    input.method,
    input.path,
    input.query ?? "",
    names.map((n) => `${n}:${headers[n]}\n`).join(""),
    names.join(";"),
    input.payloadHash,
  ].join("\n");
  const scope = `${date}/${input.region}/${service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", input.amzDate, scope, sha256(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${input.creds.secretAccessKey}`, date), input.region), service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  return {
    signature,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.creds.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
  };
}

let cached: Creds | null = null;

async function credentials(): Promise<Creds> {
  const env = process.env;
  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    return { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY, sessionToken: env.AWS_SESSION_TOKEN || undefined };
  }
  if (cached && (!cached.expires || cached.expires - Date.now() > 5 * 60_000)) return cached;
  const fromJson = (j: { AccessKeyId: string; SecretAccessKey: string; Token?: string; Expiration?: string }): Creds => ({
    accessKeyId: j.AccessKeyId,
    secretAccessKey: j.SecretAccessKey,
    sessionToken: j.Token,
    expires: j.Expiration ? Date.parse(j.Expiration) : undefined,
  });
  const timeout = () => AbortSignal.timeout(2000);

  // ECS / App Runner task role
  const rel = env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
  const full = env.AWS_CONTAINER_CREDENTIALS_FULL_URI;
  if (rel || full) {
    const res = await fetch(rel ? `http://169.254.170.2${rel}` : full!, {
      headers: env.AWS_CONTAINER_AUTHORIZATION_TOKEN ? { Authorization: env.AWS_CONTAINER_AUTHORIZATION_TOKEN } : {},
      signal: timeout(),
    });
    if (!res.ok) throw new Error(`Could not read the task role credentials (${res.status}).`);
    return (cached = fromJson(await res.json()));
  }

  // EC2 instance role (IMDSv2)
  try {
    const base = "http://169.254.169.254/latest";
    const token = await (await fetch(`${base}/api/token`, { method: "PUT", headers: { "X-aws-ec2-metadata-token-ttl-seconds": "21600" }, signal: timeout() })).text();
    const h = { "X-aws-ec2-metadata-token": token };
    const role = (await (await fetch(`${base}/meta-data/iam/security-credentials/`, { headers: h, signal: timeout() })).text()).split("\n")[0]!.trim();
    const res = await fetch(`${base}/meta-data/iam/security-credentials/${role}`, { headers: h, signal: timeout() });
    if (res.ok) return (cached = fromJson(await res.json()));
  } catch {
    /* not on EC2 */
  }
  throw new Error("No AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or run on AWS with a role that can write to the bucket.");
}

export function s3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || process.env.AWS_REGION || "ap-south-1";
  if (!bucket) throw new Error("STORAGE_DRIVER is s3 but S3_BUCKET is not set.");
  // S3_ENDPOINT is only for S3-compatible services (MinIO, R2); AWS needs nothing.
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  const host = endpoint ? new URL(endpoint).host : `${bucket}.s3.${region}.amazonaws.com`;
  const origin = endpoint ?? `https://${host}`;
  const prefix = endpoint ? `/${bucket}` : ""; // path-style for custom endpoints
  // Public address of files: CloudFront (recommended) or the bucket itself.
  const publicBase = (process.env.S3_PUBLIC_URL || `${origin}${prefix}`).replace(/\/$/, "");
  return { bucket, region, host, origin, prefix, publicBase };
}

export function s3Driver(): StorageDriver {
  const cfg = s3Config();
  return {
    name: "s3",
    async put(key, body, contentType) {
      const creds = await credentials();
      const path = `${cfg.prefix}/${encodeKey(key)}`;
      const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const payloadHash = sha256(body);
      const headers: Record<string, string> = {
        "content-type": contentType,
        "cache-control": CACHE_CONTROL,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        ...(creds.sessionToken ? { "x-amz-security-token": creds.sessionToken } : {}),
      };
      const { authorization } = signV4({ method: "PUT", host: cfg.host, path, headers, payloadHash, region: cfg.region, amzDate, creds });
      const res = await fetch(`${cfg.origin}${path}`, { method: "PUT", headers: { ...headers, authorization }, body: new Uint8Array(body) });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1];
        throw new Error(`Upload to S3 failed (${res.status}${code ? ` ${code}` : ""}).`);
      }
      return `${cfg.publicBase}/${encodeKey(key)}`;
    },
  };
}

/** Uploaded files have random names and never change, so browsers may keep them for a year. */
export const CACHE_CONTROL = "public, max-age=31536000, immutable";

const amzNow = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * A signed address the admin's browser can PUT one file to, straight into the
 * bucket (AWS S3 or Cloudflare R2). Used on hosts like Netlify, where requests
 * through the site are limited to a few MB. The browser must send exactly these
 * headers; the bucket needs a CORS rule allowing PUT from the site (docs/STORAGE.md).
 */
export async function presignPut(key: string, contentType: string, expiresSeconds = 900) {
  const cfg = s3Config();
  const creds = await credentials();
  const amzDate = amzNow();
  const path = `${cfg.prefix}/${encodeKey(key)}`;
  const headers = { "cache-control": CACHE_CONTROL, "content-type": contentType };
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${creds.accessKeyId}/${amzDate.slice(0, 8)}/${cfg.region}/s3/aws4_request`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "cache-control;content-type;host",
    ...(creds.sessionToken ? { "X-Amz-Security-Token": creds.sessionToken } : {}),
  };
  const query = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k]!)}`)
    .join("&");
  const { signature } = signV4({ method: "PUT", host: cfg.host, path, query, headers, payloadHash: "UNSIGNED-PAYLOAD", region: cfg.region, amzDate, creds });
  return { url: `${cfg.origin}${path}?${query}&X-Amz-Signature=${signature}`, headers, publicUrl: `${cfg.publicBase}/${encodeKey(key)}` };
}

/** A signed request to the bucket from the server (HEAD, ranged GET, DELETE). */
async function s3Fetch(method: "HEAD" | "GET" | "DELETE", key: string, extra: Record<string, string> = {}) {
  const cfg = s3Config();
  const creds = await credentials();
  const amzDate = amzNow();
  const path = `${cfg.prefix}/${encodeKey(key)}`;
  const payloadHash = sha256("");
  const headers: Record<string, string> = {
    ...extra,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(creds.sessionToken ? { "x-amz-security-token": creds.sessionToken } : {}),
  };
  const { authorization } = signV4({ method, host: cfg.host, path, headers, payloadHash, region: cfg.region, amzDate, creds });
  return fetch(`${cfg.origin}${path}`, { method, headers: { ...headers, authorization } });
}

/** Size and first bytes of an uploaded object, so the server can check what was really uploaded. */
export async function inspectObject(key: string): Promise<{ size: number; head: Buffer } | null> {
  const meta = await s3Fetch("HEAD", key);
  if (!meta.ok) return null;
  const size = Number(meta.headers.get("content-length") ?? 0);
  const res = await s3Fetch("GET", key, { range: "bytes=0-31" });
  if (!res.ok) return null;
  return { size, head: Buffer.from(await res.arrayBuffer()) };
}

export async function deleteObject(key: string) {
  await s3Fetch("DELETE", key).catch(() => {});
}
