export const SITE_TIME_ZONE = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: SITE_TIME_ZONE,
});

/** DD Month YYYY in Asia/Kolkata, e.g. "26 March 2024". */
export function formatDate(date: Date | string): string {
  return dateFormatter.format(typeof date === "string" ? new Date(date) : date);
}

/** Ages come only from the product record. ageMax null means "ageMin+". */
export function formatAges(ageMin: number | null, ageMax: number | null): string | null {
  if (ageMin == null) return null;
  if (ageMax == null) return `Ages ${ageMin}+`;
  return `Ages ${ageMin}–${ageMax}`;
}
