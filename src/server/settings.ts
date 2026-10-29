import "server-only";
import { cache } from "react";
import { SITE } from "@/config/site";
import { hasDatabase } from "./env";
import type { ShippingRules } from "@/features/checkout/pricing";

type Json = Record<string, unknown>;

export const getSetting = cache(async <T extends Json>(key: string): Promise<Partial<T>> => {
  if (!hasDatabase()) return {};
  try {
    const { db } = await import("./db");
    const row = await db.setting.findUnique({ where: { key } });
    return (row?.value as Partial<T>) ?? {};
  } catch {
    return {};
  }
});

/** Shipping rules from admin settings, falling back to the site defaults for anything not set yet. */
export async function getShippingRules(): Promise<ShippingRules> {
  const s = await getSetting<{ flatRatePaise: number | null; freeShippingThresholdPaise: number | null; codEnabled: boolean; codFeePaise: number }>(
    "shipping",
  );
  return {
    flatRatePaise: s.flatRatePaise ?? SITE.flatShippingPaise,
    freeFromPaise: s.freeShippingThresholdPaise ?? SITE.freeShippingFromPaise,
    codEnabled: Boolean(s.codEnabled) && hasDatabase(),
    codFeePaise: s.codFeePaise ?? 0,
  };
}
