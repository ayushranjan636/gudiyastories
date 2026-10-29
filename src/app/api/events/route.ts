import { createHash } from "node:crypto";
import { z } from "zod";
import { hasDatabase } from "@/server/env";

const TYPES = [
  "page_view",
  "product_view",
  "add_to_bag",
  "checkout_started",
  "whatsapp_click",
  "resource_download",
  "enquiry_submitted",
  "look_inside_opened",
  "class_enquiry",
] as const;

const schema = z.object({
  type: z.enum(TYPES),
  path: z.string().max(300),
  search: z.string().max(600).optional(),
  referrer: z.string().max(600).nullable().optional(),
  productSlug: z.string().max(120).optional(),
  valuePaise: z.number().int().nonnegative().max(10_000_000).optional(),
  meta: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor/i;

function device(ua: string) {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Cookie-free analytics. The session id is a hash of a daily salt, the IP and
 * the user agent, so it cannot be linked across days and no raw IP is stored.
 */
export async function POST(req: Request) {
  if (!hasDatabase()) return new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT.test(ua)) return new Response(null, { status: 204 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return new Response(null, { status: 400 });
  }

  const ip = req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "0.0.0.0";
  const day = new Date().toISOString().slice(0, 10);
  const salt = createHash("sha256").update(`${process.env.ANALYTICS_SALT_SECRET ?? "gudiya"}:${day}`).digest("hex");
  const sessionId = createHash("sha256").update(`${salt}:${ip}:${ua}`).digest("hex").slice(0, 32);

  const params = new URLSearchParams(body.search ?? "");
  let referrerHost: string | null = null;
  try {
    if (body.referrer) {
      const host = new URL(body.referrer).hostname;
      const self = new URL(req.url).hostname;
      referrerHost = host === self ? null : host.replace(/^www\./, "");
    }
  } catch {
    referrerHost = null;
  }

  const { db } = await import("@/server/db");
  let productId: string | null = null;
  if (body.productSlug) {
    productId = (await db.product.findUnique({ where: { slug: body.productSlug }, select: { id: true } }))?.id ?? null;
  }
  await db.analyticsEvent.create({
    data: {
      type: body.type,
      sessionId,
      path: body.path,
      productId,
      valuePaise: body.valuePaise ?? null,
      referrer: referrerHost ? body.referrer : null,
      referrerHost,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      utmContent: params.get("utm_content"),
      utmTerm: params.get("utm_term"),
      device: device(ua),
      country: req.headers.get("x-vercel-ip-country"),
      meta: body.meta ?? undefined,
    },
  });
  return new Response(null, { status: 204 });
}
