import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { hasStorage } from "@/server/storage";
import { ProductForm, type ProductFormValues } from "./product-form";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [product, values, books] = await Promise.all([
    isNew
      ? null
      : db.product.findUnique({
          where: { id },
          include: { images: { orderBy: { position: "asc" } }, spreads: { orderBy: { position: "asc" } }, values: { include: { value: true } }, bundleItems: true },
        }),
    db.value.findMany({ orderBy: { position: "asc" } }),
    db.product.findMany({ where: { type: { not: "BUNDLE" }, status: { not: "ARCHIVED" } }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true, pricePaise: true, mrpPaise: true } }),
  ]);
  if (!isNew && !product) notFound();

  const initial: ProductFormValues = product
    ? {
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        type: product.type,
        status: product.status,
        featured: product.featured,
        sortOrder: product.sortOrder,
        shortDescription: product.shortDescription,
        longDescriptionHtml: product.longDescriptionHtml ?? "",
        ageMin: product.ageMin,
        ageMax: product.ageMax,
        pages: product.pages,
        binding: product.binding ?? "",
        paper: product.paper ?? "",
        isbn: product.isbn ?? "",
        publishedOn: product.publishedOn ? product.publishedOn.toISOString().slice(0, 10) : "",
        priceRupees: product.pricePaise / 100,
        mrpRupees: product.mrpPaise / 100,
        costRupees: product.costPaise != null ? product.costPaise / 100 : null,
        weightGrams: product.weightGrams,
        hsnCode: product.hsnCode ?? "",
        amazonUrl: product.amazonUrl ?? "",
        flipkartUrl: product.flipkartUrl ?? "",
        goodFor: product.goodFor,
        spineColor: product.spineColor ?? "#2F6B2A",
        seoTitle: product.seoTitle ?? "",
        seoDescription: product.seoDescription ?? "",
        lowStockThreshold: product.lowStockThreshold,
        values: product.values.map((v) => v.value.slug),
        images: product.images.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })),
        spreads: product.spreads.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })),
        components: product.bundleItems.map((b) => ({ productId: b.componentId, quantity: b.quantity })),
      }
    : {
        title: "",
        slug: "",
        sku: "",
        type: sp.type === "BUNDLE" ? "BUNDLE" : "STORY",
        status: "DRAFT",
        featured: false,
        sortOrder: 50,
        shortDescription: "",
        longDescriptionHtml: "",
        ageMin: null,
        ageMax: null,
        pages: null,
        binding: "Paperback",
        paper: "300gsm art paper, matte lamination",
        isbn: "",
        publishedOn: "",
        priceRupees: 0,
        mrpRupees: 0,
        costRupees: null,
        weightGrams: null,
        hsnCode: "4901",
        amazonUrl: "",
        flipkartUrl: "",
        goodFor: [],
        spineColor: "#2F6B2A",
        seoTitle: "",
        seoDescription: "",
        lowStockThreshold: 10,
        values: [],
        images: [],
        spreads: [],
        components: [],
      };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-small text-ink-soft hover:text-ink">← Products</Link>
        <h1 className="mt-2 text-h3">{isNew ? (initial.type === "BUNDLE" ? "New set" : "New book") : product!.title}</h1>
      </div>
      <ProductForm
        id={isNew ? null : id}
        initial={initial}
        values={values.map((v) => ({ slug: v.slug, name: v.name }))}
        books={books.filter((b) => b.id !== id).map((b) => ({ id: b.id, title: b.title, priceRupees: b.pricePaise / 100, mrpRupees: b.mrpPaise / 100 }))}
        canUpload={hasStorage()}
        publicUrl={product ? (product.type === "BUNDLE" ? `/sets/${product.slug}` : `/books/${product.slug}`) : null}
      />
    </div>
  );
}
