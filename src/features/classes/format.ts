import { formatINR } from "@/lib/money";

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const short = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Start dates are stored as calendar dates (no time), so they are formatted in UTC. */
export function formatStart(d: Date | null, style: "long" | "short" = "long") {
  if (!d) return null;
  return (style === "long" ? day : short).format(d);
}

export function formatClassPrice(pricePaise: number | null) {
  return pricePaise == null || pricePaise === 0 ? "Free" : formatINR(pricePaise);
}

/** "Starts 12 Nov" / "Started 3 Oct" / null */
export function startLabel(d: Date | null) {
  if (!d) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return `${d.getTime() < todayUtc ? "Started" : "Starts"} ${formatStart(d, "short")}`;
}
