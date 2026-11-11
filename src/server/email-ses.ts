import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { awsCredentials, signV4 } from "./storage-s3";

/**
 * Amazon SES (API v2) without extra packages: requests are signed with AWS
 * Signature V4, the same signer the S3 uploads use.
 *
 * Credentials: on the EC2 server, its IAM role (send-only, @gudiyastories.com);
 * elsewhere AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
 */

export type SesMessage = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Uint8Array; contentType?: string }[];
};

const b64 = (s: string | Uint8Array) => Buffer.from(s).toString("base64");
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
// RFC 2047 encoded-word for non-ASCII headers (names, subjects with ₹ or –).
const header = (s: string) => (/^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const address = (a: string) => {
  const m = a.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? `${header(m[1]!.replace(/^"|"$/g, ""))} <${m[2]}>` : a.trim();
};
const safeName = (n: string) => n.replace(/[^A-Za-z0-9._ -]/g, "_");

/** Builds the raw MIME message: text + HTML alternatives, plus any attachments. */
export function buildMime(m: SesMessage) {
  const mixed = `mixed_${randomBytes(12).toString("hex")}`;
  const alt = `alt_${randomBytes(12).toString("hex")}`;
  const lines = [
    `From: ${address(m.from)}`,
    `To: ${address(m.to)}`,
    ...(m.replyTo ? [`Reply-To: ${address(m.replyTo)}`] : []),
    `Subject: ${header(m.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    "",
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    `--${alt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(m.text)),
    ...(m.html ? [`--${alt}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64(m.html))] : []),
    `--${alt}--`,
    "",
  ];
  for (const a of m.attachments ?? []) {
    const name = safeName(a.filename);
    lines.push(
      `--${mixed}`,
      `Content-Type: ${a.contentType ?? "application/octet-stream"}; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(b64(a.content)),
    );
  }
  lines.push(`--${mixed}--`, "");
  return lines.join("\r\n");
}

export async function sesSend(m: SesMessage): Promise<{ sent: boolean; id?: string; error?: string }> {
  const region = process.env.SES_REGION || process.env.AWS_REGION || "ap-south-1";
  const host = `email.${region}.amazonaws.com`;
  const path = "/v2/email/outbound-emails";
  const body = JSON.stringify({
    FromEmailAddress: m.from,
    Destination: { ToAddresses: [m.to] },
    ...(m.replyTo ? { ReplyToAddresses: [m.replyTo] } : {}),
    Content: { Raw: { Data: b64(buildMime(m)) } },
  });
  const creds = await awsCredentials();
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(creds.sessionToken ? { "x-amz-security-token": creds.sessionToken } : {}),
  };
  const { authorization } = signV4({ method: "POST", host, path, headers, payloadHash, region, service: "ses", amzDate, creds });
  const res = await fetch(`https://${host}${path}`, { method: "POST", headers: { ...headers, authorization }, body, signal: AbortSignal.timeout(15_000) });
  const json = (await res.json().catch(() => ({}))) as { MessageId?: string; message?: string; Message?: string };
  if (!res.ok) return { sent: false, error: `${res.status} ${json.message ?? json.Message ?? ""}`.trim() };
  return { sent: true, id: json.MessageId };
}
