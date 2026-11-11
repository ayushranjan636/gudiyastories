import { privateOrderLinkOk } from "@/features/orders/link-guard";
import { invoicePdf } from "@/features/orders/invoice-pdf";
import { hasDatabase } from "@/server/env";

export const dynamic = "force-dynamic";

/** GET /receipt/GS-2600001/invoice?t=<private link token> → the invoice PDF. */
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const { number } = await ctx.params;
  const t = new URL(req.url).searchParams.get("t");
  if (!hasDatabase() || !(await privateOrderLinkOk(number, t))) return new Response("Not found", { status: 404 });
  const pdf = await invoicePdf(number);
  if (!pdf) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
