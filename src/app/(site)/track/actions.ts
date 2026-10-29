"use server";

import { getPublicOrder, type PublicOrder } from "@/features/orders/public";
import { clientKey, rateLimit } from "@/server/rate-limit";

export type TrackState = { status: "idle" } | { status: "error"; message: string } | { status: "ok"; order: PublicOrder };

export async function trackOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const number = String(form.get("number") ?? "").trim().toUpperCase();
  const phone = String(form.get("phone") ?? "").trim();
  if (!number || !phone) return { status: "error", message: "Enter both the order number and the mobile number." };
  if (!(await rateLimit(await clientKey("track"), 20, 600))) {
    return { status: "error", message: "Too many tries. Please wait ten minutes." };
  }
  const order = await getPublicOrder(number, phone);
  if (!order?.address) {
    return { status: "error", message: "We couldn't find an order with that number and phone. Check both and try again." };
  }
  return { status: "ok", order };
}
