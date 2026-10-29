"use server";

import { z } from "zod";
import { hasDatabase } from "@/server/env";
import { clientKey, rateLimit } from "@/server/rate-limit";

export type SubscribeState = { status: "idle" } | { status: "ok" } | { status: "error"; message: string };

export async function subscribe(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { status: "error", message: "Please enter a valid email." };
  if (!(await rateLimit(await clientKey("subscribe"), 10, 3600))) return { status: "error", message: "Please try again later." };
  if (!hasDatabase()) return { status: "error", message: "Sign-ups open soon. Please message us on WhatsApp for now." };
  const source = String(form.get("source") ?? "").slice(0, 80) || null;
  const { db } = await import("@/server/db");
  await db.subscriber.upsert({
    where: { email: email.data },
    create: { email: email.data, source },
    update: { unsubscribedAt: null },
  });
  return { status: "ok" };
}
