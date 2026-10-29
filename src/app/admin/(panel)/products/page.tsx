import Image from "next/image";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { stockLevels } from "@/server/reports";
import { Badge, btn, PageHeader, Table, Tabs } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { formatAges } from "@/lib/format";
import { BulkStatus } from "./bulk-status";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const type = ["STORY", "COLOURING", "BUNDLE"].includes(sp.type ?? "") ? (sp.type as "STORY") : undefined;
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(sp.status ?? "") ? (sp.status as "ACTIVE") : undefined;
  const [products, stock] = await Promise.all([
    db.product.findMany({
      where: { ...(type ? { type } : {}), ...(status ? { status } : {}), ...(sp.q ? { title: { contains: sp.q, mode: "insensitive" } } : {}) },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      include: { images: { orderBy: { position: "asc" }, take: 1 }, values: { include: { value: true } } },
    }),
    stockLevels(),
  ]);
  const stockById = new Map(stock.map((s) => [s.id, s]));
  const active = `/admin/products${type ? `?type=${type}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Books, colouring books and sets. Changes show on the site straight away."
        actions={
          <>
            <Link href="/admin/products/new?type=BUNDLE" className={btn.secondary}>New set</Link>
            <Link href="/admin/products/new" className={btn.primary}>New book</Link>
          </>
        }
      />
      <Tabs
        active={active}
        items={[
          { href: "/admin/products", label: "All" },
          { href: "/admin/products?type=STORY", label: "Stories" },
          { href: "/admin/products?type=COLOURING", label: "Colouring" },
          { href: "/admin/products?type=BUNDLE", label: "Sets" },
        ]}
      />
      <BulkStatus>
        <Table>
          <thead>
            <tr>
              <th className="w-8"><span className="sr-only">Select</span></th>
              <th>Product</th>
              <th>Status</th>
              <th>Ages</th>
              <th>Values</th>
              <th className="text-right">Price</th>
              <th className="text-right">Available</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const s = stockById.get(p.id);
              const img = p.images[0];
              return (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.title}`} className="size-4 accent-leaf" />
                  </td>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-leaf">
                      {img ? <Image src={img.url} alt="" width={img.width ?? 60} height={img.height ?? 80} className="h-12 w-auto rounded-[2px]" /> : <span className="h-12 w-9 rounded bg-paper-deep" />}
                      <span>
                        <span className="font-medium">{p.title}</span>
                        <span className="block text-ink-soft">{p.sku}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <Badge tone={p.status === "ACTIVE" ? "green" : p.status === "DRAFT" ? "amber" : "neutral"}>{p.status.toLowerCase()}</Badge>
                    {p.featured ? <span className="ml-1"><Badge tone="lime">featured</Badge></span> : null}
                  </td>
                  <td className="whitespace-nowrap">{formatAges(p.ageMin, p.ageMax)?.replace("Ages ", "") ?? "–"}</td>
                  <td className="text-ink-soft">{p.values.map((v) => v.value.name).join(", ")}</td>
                  <td className="text-right tabular-nums">
                    {formatINR(p.pricePaise)}
                    <span className="block text-ink-soft line-through">{formatINR(p.mrpPaise)}</span>
                  </td>
                  <td className="text-right">
                    {s ? <Badge tone={s.available === 0 ? "red" : s.low ? "amber" : "neutral"}>{s.available}</Badge> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </BulkStatus>
    </div>
  );
}
