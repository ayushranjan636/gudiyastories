import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { checkWriting } from "../src/lib/writing-rules";
import { BOOKS, BUNDLES, VALUES } from "./data/catalogue";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL (or DATABASE_URL) before seeding.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const paise = (rupees: number) => Math.round(rupees * 100);
const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const PLACEHOLDER_PDF = "/resources/after-the-story-placeholder.pdf";

function assertCopy(label: string, text: string) {
  const issues = checkWriting(text);
  if (issues.length) {
    throw new Error(`Writing rules failed for ${label}: ${issues.map((i) => `${i.kind} "${i.match}"`).join(", ")}`);
  }
}

async function seedValues() {
  for (const [position, v] of VALUES.entries()) {
    assertCopy(`value ${v.slug}`, v.description);
    await db.value.upsert({
      where: { slug: v.slug },
      create: { slug: v.slug, name: v.name, description: v.description, position },
      update: { name: v.name, description: v.description, position },
    });
  }
  const values = await db.value.findMany();
  return new Map(values.map((v) => [v.slug, v.id]));
}

async function seedBooks(valueIds: Map<string, string>) {
  for (const [sortOrder, b] of BOOKS.entries()) {
    assertCopy(b.sku, b.shortDescription);
    const data = {
      title: b.title,
      slug: b.slug,
      type: b.type,
      status: "ACTIVE",
      featured: b.type === "STORY",
      sortOrder,
      shortDescription: b.shortDescription,
      ageMin: b.ageMin,
      ageMax: b.ageMax,
      pages: b.pages,
      paper: b.paper,
      binding: b.type === "STORY" ? "Paperback" : "Paperback, perforated pages",
      isbn: b.isbn,
      publishedOn: date(b.publishedOn),
      pricePaise: paise(b.priceRupees),
      mrpPaise: paise(b.mrpRupees),
      hsnCode: "4901", // printed books. [CONFIRM WITH CA]
      spineColor: b.spineColor,
    } satisfies Omit<Prisma.ProductCreateInput, "sku">;

    const product = await db.product.upsert({
      where: { sku: b.sku },
      create: { sku: b.sku, ...data },
      update: data,
    });

    await db.productValue.deleteMany({ where: { productId: product.id } });
    await db.productValue.createMany({
      data: b.values.map((slug) => {
        const valueId = valueIds.get(slug);
        if (!valueId) throw new Error(`Unknown value ${slug}`);
        return { productId: product.id, valueId };
      }),
    });

    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.create({
      data: {
        productId: product.id,
        url: b.cover.src,
        alt: b.cover.alt,
        width: b.cover.width,
        height: b.cover.height,
        position: 0,
      },
    });

    // "Look inside" pages: added once. After that, Admin owns them (never overwritten).
    if (b.inside?.length && (await db.spread.count({ where: { productId: product.id } })) === 0) {
      await db.spread.createMany({
        data: [b.cover, ...b.inside].map((pg, position) => ({ productId: product.id, url: pg.src, alt: pg.alt, width: pg.width, height: pg.height, position })),
      });
    }

    // One "After the story" placeholder per book. Unpublished until the real PDF exists.
    const resourceSlug = `after-the-story-${b.slug}`;
    const resource = {
      title: `[CONTENT NEEDED] After the story: ${b.title}`,
      description: "[CONTENT NEEDED] Three to five questions to ask once the last page is turned.",
      kind: "AFTER_THE_STORY",
      fileUrl: PLACEHOLDER_PDF,
      emailCapture: true,
      published: false,
      isPlaceholder: true,
      productId: product.id,
    } as const;
    await db.resource.upsert({
      where: { slug: resourceSlug },
      create: { slug: resourceSlug, ...resource },
      update: resource,
    });
  }
}

async function seedBundles() {
  const books = await db.product.findMany({
    where: { sku: { in: BOOKS.map((b) => b.sku) } },
    include: { values: true },
  });
  const bySku = new Map(books.map((b) => [b.sku, b]));

  for (const [i, bundle] of BUNDLES.entries()) {
    assertCopy(bundle.sku, bundle.shortDescription);
    const components = bundle.componentSkus.map((sku) => {
      const p = bySku.get(sku);
      if (!p) throw new Error(`Bundle ${bundle.sku} references unknown SKU ${sku}`);
      return p;
    });

    const sumOfSingles = components.reduce((sum, c) => sum + c.pricePaise, 0);
    const price = paise(bundle.priceRupees);
    if (price >= sumOfSingles) {
      throw new Error(`Bundle ${bundle.sku} costs ${price} paise, not less than the singles (${sumOfSingles}).`);
    }

    // Ages and values are derived from the component records, never typed in.
    const ageMin = Math.min(...components.map((c) => c.ageMin ?? 0));
    const ageMax = components.some((c) => c.ageMax == null) ? null : Math.max(...components.map((c) => c.ageMax ?? 0));
    const valueIdsForBundle = [...new Set(components.flatMap((c) => c.values.map((v) => v.valueId)))];

    const data = {
      title: bundle.title,
      slug: bundle.slug,
      type: "BUNDLE",
      status: "ACTIVE",
      sortOrder: 100 + i,
      shortDescription: bundle.shortDescription,
      ageMin,
      ageMax,
      pricePaise: price,
      mrpPaise: paise(bundle.mrpRupees),
      hsnCode: "4901",
    } satisfies Omit<Prisma.ProductCreateInput, "sku">;

    const product = await db.product.upsert({
      where: { sku: bundle.sku },
      create: { sku: bundle.sku, ...data },
      update: data,
    });

    await db.bundleItem.deleteMany({ where: { bundleId: product.id } });
    await db.bundleItem.createMany({
      data: components.map((c) => ({ bundleId: product.id, componentId: c.id, quantity: 1 })),
    });

    await db.productValue.deleteMany({ where: { productId: product.id } });
    await db.productValue.createMany({
      data: valueIdsForBundle.map((valueId) => ({ productId: product.id, valueId })),
    });
  }
}

async function seedDemoStock() {
  // Stock is a ledger. Real opening counts are pending from the client (see CONTENT-TODO).
  // For local development only, SEED_DEMO_STOCK=true adds a clearly labelled restock.
  if (process.env.SEED_DEMO_STOCK !== "true") return;
  const books = await db.product.findMany({ where: { type: { not: "BUNDLE" } } });
  for (const b of books) {
    const existing = await db.stockMovement.count({ where: { productId: b.id } });
    if (existing > 0) continue;
    await db.stockMovement.create({
      data: { productId: b.id, type: "RESTOCK", quantity: 50, reason: "Demo stock", note: "Development data. Replace with real counts." },
    });
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  return db.adminUser.upsert({
    where: { email },
    create: { email, name: process.env.ADMIN_NAME ?? "Owner", passwordHash, role: "OWNER" },
    // Re-running the seed resets the password to the .env value.
    update: { passwordHash, role: "OWNER", active: true },
  });
}

const draftDoc = (text: string): Prisma.InputJsonValue => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

async function seedNotes(authorId: string) {
  const categories = [
    { slug: "reading-at-home", name: "Reading at home" },
    { slug: "in-the-classroom", name: "In the classroom" },
    { slug: "how-a-book-is-made", name: "How a book is made" },
  ];
  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name } });
  }

  const posts = [
    { slug: "draft-note-1", title: "[DRAFT – REPLACE] A note about reading aloud at home", category: "reading-at-home" },
    { slug: "draft-note-2", title: "[DRAFT – REPLACE] A note from the classroom", category: "in-the-classroom" },
    { slug: "draft-note-3", title: "[DRAFT – REPLACE] How a Gudiya Stories book is made", category: "how-a-book-is-made" },
  ];

  for (const p of posts) {
    const body = "[DRAFT – REPLACE] This note is a placeholder. Bharathi will write the real text.";
    const category = await db.category.findUniqueOrThrow({ where: { slug: p.category } });
    const data = {
      title: p.title,
      excerpt: "[DRAFT – REPLACE] One or two sentences about this note.",
      content: draftDoc(body),
      contentHtml: `<p>${body}</p>`,
      status: "DRAFT",
      readingMinutes: 1,
      categoryId: category.id,
      authorId,
    } as const;
    await db.post.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...data }, update: data });
  }
}

async function seedSettings() {
  // Values the client has not given us are null and listed in CONTENT-TODO.
  const settings: Record<string, Prisma.InputJsonValue> = {
    store: {
      name: "Gudiya Stories",
      city: "Tirupati",
      state: "Andhra Pradesh",
      country: "India",
      address: null,
      email: null,
      phoneE164: null,
      whatsappE164: null,
      onlineOnly: true,
      hours: null,
    },
    shipping: {
      flatRatePaise: null,
      freeShippingThresholdPaise: null,
      codEnabled: false,
      codFeePaise: 0,
      serviceablePinCodes: [],
    },
    bulkTiers: [
      { minQuantity: 25, discountPercent: null },
      { minQuantity: 100, discountPercent: null },
      { minQuantity: 500, discountPercent: null },
    ],
    invoice: {
      documentType: "BILL_OF_SUPPLY", // [CONFIRM WITH CA]
      gstin: null,
      gstRatePercent: 0,
      hsnDefault: "4901",
      note: "[CONFIRM WITH CA] Printed books are generally GST nil-rated (HSN 4901/4903).",
    },
    inventory: { lowStockDefault: 10, dailyDigest: true },
    social: { instagram: null, facebook: null, youtube: null, amazonStore: null, flipkartStore: null },
  };

  for (const [key, value] of Object.entries(settings)) {
    // Never overwrite settings the owner has already edited.
    await db.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
}

async function main() {
  const valueIds = await seedValues();
  await seedBooks(valueIds);
  await seedBundles();
  await seedDemoStock();
  const admin = await seedAdmin();
  await seedNotes(admin.id);
  await seedSettings();

  const counts = {
    products: await db.product.count(),
    bundles: await db.product.count({ where: { type: "BUNDLE" } }),
    resources: await db.resource.count(),
    posts: await db.post.count(),
  };
  console.log("Seed complete:", counts, `admin: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
