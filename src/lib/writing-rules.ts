// Writing rules from docs/brief.md section 4.
// Used by the seed script now, and by the admin product/blog editors later.

export const BANNED_PHRASES = [
  "magical",
  "enchanting",
  "embark",
  "journey", // allowed only when literal; flagged for a human to check
  "unlock",
  "unleash",
  "tapestry",
  "delve",
  "captivating",
  "whimsical",
  "treasure trove",
  "in today's world",
  "look no further",
  "elevate",
  "curated",
  "seamless",
  "dive into",
  "ignite",
  "spark joy",
  "a world of",
  "more than just",
] as const;

// "where X meets Y"
const WHERE_MEETS = /\bwhere\s+[\w'-]+(?:\s+[\w'-]+){0,3}\s+meets\s+\w+/i;

// Pictographic emoji (covers the common ranges; ₹ and punctuation are not matched).
const EMOJI = /\p{Extended_Pictographic}/u;

export type WritingIssue = { kind: "banned" | "emoji" | "em-dash" | "exclamations"; match: string };

export function checkWriting(text: string, opts: { maxExclamations?: number } = {}): WritingIssue[] {
  const issues: WritingIssue[] = [];
  const lower = text.toLowerCase().replace(/[’‘]/g, "'");

  for (const phrase of BANNED_PHRASES) {
    const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    if (pattern.test(lower)) issues.push({ kind: "banned", match: phrase });
  }
  const meets = lower.match(WHERE_MEETS);
  if (meets) issues.push({ kind: "banned", match: meets[0] });

  const emoji = text.match(EMOJI);
  if (emoji) issues.push({ kind: "emoji", match: emoji[0] });

  if (text.includes("—")) issues.push({ kind: "em-dash", match: "—" });

  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations > (opts.maxExclamations ?? 1)) {
    issues.push({ kind: "exclamations", match: `${exclamations} exclamation marks` });
  }

  return issues;
}
