import "server-only";
import { SITE } from "@/config/site";
import { AWARDS } from "@/content/author";
import { COLOURED } from "@/content/gallery";
import { getCatalogue } from "@/features/catalogue/repo";
import type { CatalogueProduct } from "@/features/catalogue/types";
import { getPublishedPosts } from "@/features/blog/repo";
import { getClasses } from "@/features/classes/repo";
import { formatClassPrice, formatStart } from "@/features/classes/format";
import { formatINR } from "@/lib/money";

// /llms.txt and /llms-full.txt: a plain Markdown summary of the shop for AI
// assistants and answer engines (see llmstxt.org). Built from the same data as
// the pages, so it stays current when books, classes or posts change in Admin.

const KIND = { STORY: "Picture book", COLOURING: "Colouring book", BUNDLE: "Set" } as const;

/** HTML from the editor to readable plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|div|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

function ages(p: CatalogueProduct) {
  if (p.ageMin == null) return null;
  return p.ageMax == null ? `ages ${p.ageMin}+` : `ages ${p.ageMin}–${p.ageMax}`;
}

function productLine(p: CatalogueProduct, base: string, valueName: Map<string, string>) {
  const path = p.type === "BUNDLE" ? `/sets/${p.slug}` : `/books/${p.slug}`;
  const facts = [
    KIND[p.type],
    ages(p),
    formatINR(p.pricePaise) + (p.mrpPaise > p.pricePaise ? ` (MRP ${formatINR(p.mrpPaise)})` : ""),
    p.values.length ? `values: ${p.values.map((v) => valueName.get(v) ?? v).join(", ")}` : null,
  ].filter(Boolean);
  return `- [${p.title}](${base}${path}): ${oneLine(p.shortDescription)} (${facts.join("; ")})`;
}

export async function buildLlmsTxt({ full }: { full: boolean }): Promise<string> {
  const base = SITE.url.replace(/\/$/, "");
  const [{ products, values }, classes, posts] = await Promise.all([getCatalogue(), getClasses(), getPublishedPosts()]);
  const valueName = new Map(values.map((v) => [v.slug, v.name]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const stories = products.filter((p) => p.type === "STORY");
  const colouring = products.filter((p) => p.type === "COLOURING");
  const sets = products.filter((p) => p.type === "BUNDLE");
  const openClasses = classes.filter((c) => c.status === "PUBLISHED");

  const out: string[] = [];
  const h = (s: string) => out.push("", `## ${s}`, "");

  out.push(
    `# ${SITE.name}`,
    "",
    `> ${SITE.name} is an independent children's publisher in ${SITE.city}, ${SITE.region}, ${SITE.country}. It publishes value-based picture books for children aged about 4 to 13 and mindful mandala colouring books, all written and designed by early-years teacher ${SITE.author}, printed in India and sold directly on this website with delivery across India.`,
    "",
    `Each picture book is built around one value (${values.map((v) => v.name.toLowerCase()).join(", ")}) and has free after-the-story question cards for the adult to use after reading. ${SITE.author} has taught in early-years classrooms for more than fifteen years and reads every draft aloud to children before it is printed. The site also lists live online classes she teaches, free printable resources, and bulk orders for schools, libraries and CSR programmes.`,
  );

  h("Picture books");
  for (const p of stories) out.push(productLine(p, base, valueName));

  h("Colouring books");
  for (const p of colouring) out.push(productLine(p, base, valueName));

  if (sets.length) {
    h("Sets");
    for (const p of sets) {
      const inside = p.components.map((c) => bySlug.get(c.slug)?.title).filter(Boolean);
      out.push(productLine(p, base, valueName) + (inside.length ? ` Contains: ${inside.join(", ")}.` : ""));
    }
  }

  if (openClasses.length) {
    h("Online classes");
    for (const c of openClasses) {
      const facts = [c.audience, c.mode, c.duration, formatStart(c.startDate) ? `starts ${formatStart(c.startDate)}` : null, formatClassPrice(c.pricePaise)].filter(Boolean);
      out.push(`- [${c.title}](${base}/classes/${c.slug}): ${oneLine(c.summary)} (${facts.join("; ")})`);
    }
  }

  h("Pages");
  out.push(
    `- [All books](${base}/books): filter by value, age and type`,
    `- [Classes](${base}/classes): live online classes by ${SITE.author}`,
    `- [For schools, libraries and CSR](${base}/for-schools): bulk orders, custom bookplates and author reading sessions`,
    `- [Free resources](${base}/resources): after-the-story question cards, colouring pages and reading tips`,
    `- [Readers' gallery](${base}/gallery): ${COLOURED.length + 1} mandala pages coloured by children, and videos of the books at home`,
    `- [About](${base}/about): ${SITE.author}, how a book is made, and recognition for her teaching`,
    `- [Blog](${base}/blog): notes on reading with children, colouring and classroom ideas`,
  );

  if (posts.length) {
    h("Blog posts");
    for (const p of posts.slice(0, full ? 50 : 10)) out.push(`- [${p.title}](${base}/blog/${p.slug}): ${oneLine(p.excerpt)}`);
  }

  h("Contact");
  out.push(
    `- Email: ${SITE.email}`,
    `- WhatsApp / phone: ${SITE.phoneDisplay}`,
    `- Instagram: ${SITE.instagram}`,
    `- Based in ${SITE.city}, ${SITE.region}, ${SITE.country}. Prices are in Indian rupees.`,
  );

  if (!full) {
    h("Optional");
    out.push(`- [Full details](${base}/llms-full.txt): every book's description, specifications, classes in full and the author's awards`);
    return out.join("\n") + "\n";
  }

  // ---- llms-full.txt: the same, plus the detail behind each link ----
  h("About the author");
  out.push(
    `${SITE.author} is an early-years teacher in ${SITE.city} with more than fifteen years in the classroom and a background in the IB curriculum. She grew up in Donimalai, a mining township in a forested valley in Karnataka, which is the setting of her book Mystical Landscapes of Donimalai. She writes, designs and checks every Gudiya Stories book herself.`,
    "",
    "Recognition for her teaching:",
    ...AWARDS.map((a) => `- ${a.year ? `${a.year}: ` : ""}${a.title}${a.by ? ` (${a.by})` : ""}`),
  );

  h("Books in detail");
  for (const p of products) {
    const path = p.type === "BUNDLE" ? `/sets/${p.slug}` : `/books/${p.slug}`;
    out.push(`### ${p.title}`, "", `URL: ${base}${path}`);
    const spec = [
      ["Type", KIND[p.type]],
      ["Ages", ages(p)?.replace(/^ages /, "")],
      ["Price", formatINR(p.pricePaise) + (p.mrpPaise > p.pricePaise ? ` (MRP ${formatINR(p.mrpPaise)})` : "")],
      ["Values", p.values.map((v) => valueName.get(v) ?? v).join(", ")],
      ["Good for", p.goodFor.join(", ")],
      ["Pages", p.pages?.toString()],
      ["Paper", p.paper],
      ["Binding", p.binding],
      ["ISBN", p.isbn],
      ["Published", p.publishedOn],
      ["Also on", [p.amazonUrl && "Amazon", p.flipkartUrl && "Flipkart"].filter(Boolean).join(", ")],
    ].filter((r): r is [string, string] => Boolean(r[1]));
    out.push(...spec.map(([k, v]) => `- ${k}: ${v}`), "", oneLine(p.shortDescription));
    if (p.longDescriptionHtml) out.push("", htmlToText(p.longDescriptionHtml));
    if (p.type === "BUNDLE") {
      const inside = p.components.map((c) => `${c.quantity > 1 ? `${c.quantity} × ` : ""}${bySlug.get(c.slug)?.title ?? c.slug}`);
      if (inside.length) out.push("", `Contains: ${inside.join(", ")}.`);
    }
    if (p.afterTheStory) out.push("", `Free after-the-story activity: ${p.afterTheStory.title} (${p.afterTheStory.url.startsWith("http") ? p.afterTheStory.url : base + p.afterTheStory.url})`);
    out.push("");
  }

  if (openClasses.length) {
    h("Classes in detail");
    for (const c of openClasses) {
      out.push(`### ${c.title}`, "", `URL: ${base}/classes/${c.slug}`);
      const spec = [
        ["For", c.audience],
        ["Format", c.mode],
        ["Schedule", c.schedule],
        ["Starts", formatStart(c.startDate)],
        ["Duration", c.duration],
        ["Fee", formatClassPrice(c.pricePaise) + (c.priceNote ? ` (${c.priceNote})` : "")],
      ].filter((r): r is [string, string] => Boolean(r[1]));
      out.push(...spec.map(([k, v]) => `- ${k}: ${v}`), "", oneLine(c.summary));
      if (c.topics.length) out.push("", "Covers:", ...c.topics.map((t) => `- ${t}`));
      if (c.aboutHtml) out.push("", htmlToText(c.aboutHtml));
      out.push("");
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}
