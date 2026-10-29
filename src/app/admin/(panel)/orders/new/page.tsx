import { requireAdmin } from "@/server/admin";
import { getCatalogue } from "@/features/catalogue/repo";
import { PageHeader } from "@/components/admin/ui";
import { ManualOrderForm } from "./manual-order-form";

export const metadata = { title: "New manual order" };

export default async function NewOrderPage() {
  await requireAdmin();
  const { products } = await getCatalogue();
  return (
    <div className="space-y-6">
      <PageHeader title="New manual order" description="For WhatsApp, phone, bulk, book-fair and marketplace sales. Stock is deducted when you record the payment." />
      <ManualOrderForm products={products.map((p) => ({ slug: p.slug, title: p.title, priceRupees: p.pricePaise / 100 }))} />
    </div>
  );
}
