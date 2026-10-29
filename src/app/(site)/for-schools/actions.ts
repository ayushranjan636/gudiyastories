"use server";

import { z } from "zod";
import { hasDatabase } from "@/server/env";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { ownerEmail, sendEmail } from "@/server/email";
import { SITE, whatsappLink } from "@/config/site";

const ORG_TYPES = ["SCHOOL", "LIBRARY", "NGO", "COMPANY_CSR", "BOOKSHOP", "OTHER"] as const;

const schema = z.object({
  organisation: z.string().trim().min(2, "Please enter the organisation name").max(160),
  organisationType: z.enum(ORG_TYPES, { message: "Please choose a type" }),
  city: z.string().trim().min(2, "Please enter a city").max(80),
  quantity: z.coerce.number().int().min(1, "How many copies, roughly?").max(100000),
  titles: z.array(z.string().max(80)).max(20).default([]),
  budget: z.string().trim().max(120).optional(),
  timeline: z.string().trim().max(120).optional(),
  contactName: z.string().trim().min(2, "Please enter your name").max(120),
  contactEmail: z.string().trim().email("Please enter a valid email"),
  contactPhone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), "Please enter a 10-digit Indian mobile number"),
  message: z.string().trim().max(2000).optional(),
  wantsSamplePack: z.boolean().default(false),
  wantsBookplate: z.boolean().default(false),
  wantsAuthorVisit: z.boolean().default(false),
  website: z.string().max(0).optional(), // honeypot
});

export type EnquiryState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "ok"; saved: boolean; whatsapp: string };

export async function submitEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  const raw = {
    organisation: form.get("organisation"),
    organisationType: form.get("organisationType"),
    city: form.get("city"),
    quantity: form.get("quantity"),
    titles: form.getAll("titles").map(String),
    budget: form.get("budget") || undefined,
    timeline: form.get("timeline") || undefined,
    contactName: form.get("contactName"),
    contactEmail: form.get("contactEmail"),
    contactPhone: form.get("contactPhone"),
    message: form.get("message") || undefined,
    wantsSamplePack: form.get("wantsSamplePack") === "on",
    wantsBookplate: form.get("wantsBookplate") === "on",
    wantsAuthorVisit: form.get("wantsAuthorVisit") === "on",
    website: form.get("website") || undefined,
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0]);
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { status: "error", message: "A few details need another look.", fieldErrors };
  }
  if (!(await rateLimit(await clientKey("enquiry"), 5, 3600))) {
    return { status: "error", message: "Too many enquiries from this connection. Please try again in an hour, or write to us on WhatsApp." };
  }

  const e = parsed.data;
  const phone = e.contactPhone.startsWith("+91") ? e.contactPhone : `+91${e.contactPhone}`;
  const summary = [
    `Bulk enquiry from ${e.organisation} (${e.organisationType.replace("_", " ").toLowerCase()}), ${e.city}`,
    `Copies: ${e.quantity}`,
    e.titles.length ? `Titles: ${e.titles.join(", ")}` : null,
    e.budget ? `Budget: ${e.budget}` : null,
    e.timeline ? `Timeline: ${e.timeline}` : null,
    `Wants: ${[e.wantsSamplePack && "sample pack", e.wantsBookplate && "bookplate", e.wantsAuthorVisit && "author session"].filter(Boolean).join(", ") || "not specified"}`,
    `Contact: ${e.contactName}, ${phone}, ${e.contactEmail}`,
    e.message ? `Message: ${e.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let saved = false;
  if (hasDatabase()) {
    try {
      const { db } = await import("@/server/db");
      const { website: _honeypot, ...data } = e;
      void _honeypot;
      await db.enquiry.create({ data: { ...data, contactPhone: phone } });
      await db.analyticsEvent.create({ data: { type: "enquiry_submitted", sessionId: "server", path: "/for-schools" } });
      saved = true;
    } catch (err) {
      console.error("[enquiry] save failed", err);
    }
  }
  await sendEmail({ to: ownerEmail(), subject: `New bulk enquiry: ${e.organisation}`, text: summary });

  return { status: "ok", saved, whatsapp: whatsappLink(`Hello ${SITE.name}, ${summary}`) };
}
