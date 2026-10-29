"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";
import { sanitizeHtml } from "@/lib/sanitize";

const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const schema = z.object({
  title: z.string().trim().min(3, "Add a class name").max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only"),
  summary: z.string().trim().min(10, "Add one or two sentences").max(240, "Keep it under 240 characters"),
  aboutHtml: z.string().max(100000),
  about: z.unknown().optional(),
  topics: z.array(z.string().trim().min(1).max(160)).max(30),
  audience: optional(80),
  mode: optional(80),
  schedule: optional(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  duration: z.string().trim().min(2, "Add how long it runs").max(80),
  priceRupees: z.union([z.literal(""), z.coerce.number().min(0, "Price can't be negative").max(500000)]).optional(),
  priceNote: optional(80),
  enquiryUrl: z
    .string()
    .trim()
    .url("Paste the full link, starting with https://")
    .refine((u) => u.startsWith("https://"), "Use an https:// link"),
  mediaKind: z.enum(["IMAGE", "VIDEO", "YOUTUBE"]).nullable(),
  mediaUrl: optional(500),
  posterUrl: optional(500),
  mediaAlt: optional(200),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
  isPopup: z.boolean(),
});

export type ClassInput = z.input<typeof schema>;

function refresh(slug?: string) {
  revalidatePath("/classes");
  if (slug) revalidatePath(`/classes/${slug}`);
  revalidatePath("/");
  revalidatePath("/admin/classes");
}

export async function saveClass(id: string | null, input: ClassInput) {
  const admin = await requireAdmin();
  const p = schema.safeParse(input);
  if (!p.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of p.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false as const, message: "Some fields need attention.", fieldErrors };
  }
  const d = p.data;
  if (d.mediaUrl && d.mediaKind !== "YOUTUBE" && !d.mediaAlt) {
    return { ok: false as const, message: "Describe the picture or video in a sentence.", fieldErrors: { mediaAlt: "Required with a picture or video" } };
  }
  if (d.isPopup && d.status !== "PUBLISHED") {
    return { ok: false as const, message: "Only a published class can be the pop-up.", fieldErrors: { isPopup: "Publish the class first" } };
  }
  const clash = await db.onlineClass.findFirst({ where: { slug: d.slug, NOT: id ? { id } : undefined }, select: { id: true } });
  if (clash) return { ok: false as const, message: "Another class uses that address.", fieldErrors: { slug: "Already used" } };

  const existing = id ? await db.onlineClass.findUnique({ where: { id } }) : null;
  const data = {
    title: d.title,
    slug: d.slug,
    summary: d.summary,
    aboutHtml: sanitizeHtml(d.aboutHtml),
    about: (d.about ?? existing?.about ?? undefined) as never,
    topics: d.topics,
    audience: d.audience,
    mode: d.mode,
    schedule: d.schedule,
    startDate: d.startDate ? new Date(`${d.startDate}T00:00:00Z`) : null,
    duration: d.duration,
    pricePaise: d.priceRupees === "" || d.priceRupees == null ? null : Math.round(d.priceRupees * 100),
    priceNote: d.priceNote,
    enquiryUrl: d.enquiryUrl,
    mediaKind: d.mediaUrl ? d.mediaKind : null,
    mediaUrl: d.mediaUrl,
    posterUrl: d.mediaKind === "IMAGE" ? null : d.posterUrl,
    mediaAlt: d.mediaAlt,
    status: d.status,
    isPopup: d.isPopup,
  };

  // Only one class can be the pop-up: switching it on here switches it off everywhere else.
  const saved = await db.$transaction(async (tx) => {
    if (d.isPopup) await tx.onlineClass.updateMany({ where: { isPopup: true, NOT: id ? { id } : undefined }, data: { isPopup: false } });
    return id ? tx.onlineClass.update({ where: { id }, data }) : tx.onlineClass.create({ data });
  });

  await audit(admin, id ? "UPDATE" : "CREATE", "OnlineClass", saved.id, existing ? { status: existing.status, isPopup: existing.isPopup } : undefined, { status: d.status, isPopup: d.isPopup });
  refresh(saved.slug);
  if (existing && existing.slug !== saved.slug) revalidatePath(`/classes/${existing.slug}`);
  const msg = d.status === "PUBLISHED" ? (d.isPopup ? "Published, and showing as the home-page pop-up." : "Published.") : d.status === "CLOSED" ? "Saved. Shown as closed for enquiries." : "Draft saved.";
  return { ok: true as const, message: msg, id: saved.id };
}

/** The switch in the list: on for this class, off for every other one. */
export async function setPopup(id: string, on: boolean) {
  const admin = await requireAdmin();
  const c = await db.onlineClass.findUnique({ where: { id }, select: { status: true, slug: true } });
  if (!c) return { ok: false, message: "Class not found." };
  if (on && c.status !== "PUBLISHED") return { ok: false, message: "Publish the class first, then turn the pop-up on." };
  await db.$transaction([
    ...(on ? [db.onlineClass.updateMany({ where: { isPopup: true, NOT: { id } }, data: { isPopup: false } })] : []),
    db.onlineClass.update({ where: { id }, data: { isPopup: on } }),
  ]);
  await audit(admin, "UPDATE", "OnlineClass", id, undefined, { isPopup: on });
  refresh(c.slug);
  return { ok: true, message: on ? "This class now shows as the pop-up on the home page." : "Pop-up turned off." };
}

export async function deleteClass(id: string) {
  const admin = await requireAdmin("OWNER");
  const c = await db.onlineClass.delete({ where: { id } });
  await audit(admin, "DELETE", "OnlineClass", id, { title: c.title }, undefined);
  refresh(c.slug);
  return { ok: true, message: "Deleted." };
}
