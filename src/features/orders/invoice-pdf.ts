import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/server/db";
import { getSetting } from "@/server/settings";
import { SITE } from "@/config/site";

/**
 * The customer's invoice as a PDF: attached to the order confirmation email and
 * downloadable from the receipt page. "Bill of supply" while no GSTIN is set
 * (printed books are GST nil-rated), "Tax invoice" once one is added in
 * Admin → Settings → Bills.
 */

type InvoiceSettings = { documentType?: string; gstin?: string | null; hsnDefault?: string; note?: string };

// The PDF's built-in fonts can't draw "₹", so amounts are written "Rs. 1,234.00".
const money = (paise: number) => `Rs. ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ist = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
// Keep to characters the built-in font can draw.
const clean = (s: string) => s.normalize("NFKD").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E]/g, "");

const INK = rgb(0.106, 0.102, 0.09);
const SOFT = rgb(0.353, 0.337, 0.314);
const LEAF = rgb(0.184, 0.42, 0.165);
const LINE = rgb(0.894, 0.863, 0.796);

function words(n: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? a[x]! : `${b[Math.floor(x / 10)]}${x % 10 ? ` ${a[x % 10]}` : ""}`);
  const three = (x: number) => (x >= 100 ? `${a[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${two(x % 100)}` : ""}` : two(x));
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7), lakh = Math.floor((n % 1e7) / 1e5), thousand = Math.floor((n % 1e5) / 1e3), rest = n % 1e3;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  return parts.join(" ");
}

function fit(text: string, font: PDFFont, size: number, width: number) {
  let t = clean(text);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length && font.widthOfTextAtSize(`${t}...`, size) > width) t = t.slice(0, -1);
  return `${t}...`;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  let line = "";
  for (const w of clean(text).split(/\s+/)) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export async function invoicePdf(orderNumber: string): Promise<{ filename: string; bytes: Uint8Array } | null> {
  const o = await db.order.findUnique({
    where: { number: orderNumber },
    include: { items: { include: { product: { select: { hsnCode: true } } } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!o || !o.paidAt) return null;
  const [inv, store] = await Promise.all([getSetting<InvoiceSettings>("invoice"), getSetting<{ address: string | null; email?: string | null; phoneE164?: string | null }>("store")]);
  const taxInvoice = inv.documentType === "TAX_INVOICE" && Boolean(inv.gstin);
  const title = taxInvoice ? "TAX INVOICE" : "BILL OF SUPPLY";
  const pay = o.payments.find((p) => p.status === "CAPTURED" || p.status === "PARTIALLY_REFUNDED" || p.status === "REFUNDED") ?? o.payments[0];

  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${o.number} - Gudiya Stories`);
  doc.setAuthor("Gudiya Stories");
  doc.setCreator("gudiyastories.com");
  const page: PDFPage = doc.addPage([595.28, 841.89]); // A4
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, M = 44;
  let y = 841.89 - M;

  const text = (t: string, x: number, yy: number, o2: { size?: number; font?: PDFFont; color?: typeof INK; right?: boolean } = {}) => {
    const size = o2.size ?? 9, font = o2.font ?? reg, s = clean(t);
    page.drawText(s, { x: o2.right ? x - font.widthOfTextAtSize(s, size) : x, y: yy, size, font, color: o2.color ?? INK });
  };
  const hr = (yy: number, color = LINE, thickness = 0.8) => page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness, color });

  // Header: logo, business details, document title
  try {
    const logo = await doc.embedPng(await fs.readFile(path.join(process.cwd(), "public", "brand", "gudiya-stories-mark.png")));
    const h = 46, w = (logo.width / logo.height) * h;
    page.drawImage(logo, { x: M, y: y - h + 6, width: w, height: h });
  } catch {
    /* logo is optional */
  }
  text("Gudiya Stories", M + 72, y - 6, { size: 16, font: bold });
  const addr = wrap(store.address || SITE.address, reg, 8.5, 250);
  addr.forEach((l, i) => text(l, M + 72, y - 20 - i * 11, { size: 8.5, color: SOFT }));
  let ay = y - 20 - addr.length * 11;
  text(`${SITE.phoneDisplay}  ·  ${store.email || SITE.email}`.replace("·", "|"), M + 72, ay, { size: 8.5, color: SOFT });
  if (inv.gstin) text(`GSTIN: ${inv.gstin}`, M + 72, (ay -= 11), { size: 8.5, color: SOFT });

  text(title, W - M, y - 6, { size: 15, font: bold, color: LEAF, right: true });
  text(`Invoice no.  ${o.number}`, W - M, y - 22, { size: 9, right: true });
  text(`Invoice date  ${ist(o.paidAt)}`, W - M, y - 34, { size: 9, right: true });
  text(`Order date  ${ist(o.createdAt)}`, W - M, y - 46, { size: 9, right: true });
  y = Math.min(ay, y - 46) - 18;
  hr(y);

  // Bill to / Ship to
  y -= 18;
  const col2 = W / 2 + 6;
  text("BILL TO", M, y, { size: 7.5, font: bold, color: SOFT });
  text("SHIP TO", col2, y, { size: 7.5, font: bold, color: SOFT });
  const bill = [o.contactName, o.contactPhone, o.contactEmail ?? ""].filter(Boolean);
  const ship = [o.shipName, ...wrap([o.shipLine1, o.shipLine2, o.shipLandmark].filter(Boolean).join(", "), reg, 9, W / 2 - M - 6), `${o.shipCity}, ${o.shipState} ${o.shipPinCode}`, o.shipPhone];
  const rows = Math.max(bill.length, ship.length);
  for (let i = 0; i < rows; i++) {
    if (bill[i]) text(bill[i]!, M, y - 14 - i * 12, { size: 9, font: i === 0 ? bold : reg });
    if (ship[i]) text(ship[i]!, col2, y - 14 - i * 12, { size: 9, font: i === 0 ? bold : reg });
  }
  y -= 14 + rows * 12 + 10;

  // Items table
  const cols = { n: M + 4, item: M + 26, hsn: M + 300, qty: M + 362, rate: M + 432, amt: W - M - 4 };
  page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: rgb(0.984, 0.973, 0.945) });
  text("#", cols.n, y, { size: 8, font: bold });
  text("Item", cols.item, y, { size: 8, font: bold });
  text("HSN", cols.hsn, y, { size: 8, font: bold });
  text("Qty", cols.qty, y, { size: 8, font: bold, right: true });
  text("Rate", cols.rate, y, { size: 8, font: bold, right: true });
  text("Amount", cols.amt, y, { size: 8, font: bold, right: true });
  y -= 22;
  o.items.forEach((it, i) => {
    text(String(i + 1), cols.n, y, { size: 9 });
    text(fit(it.title, reg, 9, cols.hsn - cols.item - 10), cols.item, y, { size: 9 });
    text(it.product?.hsnCode ?? inv.hsnDefault ?? "4901", cols.hsn, y, { size: 9 });
    text(String(it.quantity), cols.qty, y, { size: 9, right: true });
    text(money(it.unitPricePaise), cols.rate, y, { size: 9, right: true });
    text(money(it.lineTotalPaise), cols.amt, y, { size: 9, right: true });
    y -= 8;
    hr(y);
    y -= 12;
  });

  // Totals
  const line = (label: string, value: string, strong = false) => {
    text(label, cols.rate, y, { size: strong ? 10.5 : 9, font: strong ? bold : reg, right: true, color: strong ? INK : SOFT });
    text(value, cols.amt, y, { size: strong ? 10.5 : 9, font: strong ? bold : reg, right: true });
    y -= strong ? 18 : 14;
  };
  y -= 4;
  line("Subtotal", money(o.subtotalPaise));
  if (o.discountPaise) line(`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`, `- ${money(o.discountPaise)}`);
  line("Delivery", o.shippingPaise ? money(o.shippingPaise) : "Free");
  if (o.codFeePaise) line("Cash on delivery fee", money(o.codFeePaise));
  if (!taxInvoice) line("GST (books nil-rated)", "Rs. 0.00");
  y -= 2;
  page.drawLine({ start: { x: cols.qty - 40, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.8, color: LINE });
  line("Total", money(o.totalPaise), true);
  const rupees = Math.floor(o.totalPaise / 100), paise = o.totalPaise % 100;
  text(`Amount in words: Rupees ${words(rupees)}${paise ? ` and ${words(paise)} Paise` : ""} Only`, M, y, { size: 8.5, color: SOFT });
  y -= 24;

  // Payment
  hr(y + 8);
  y -= 8;
  text("PAYMENT", M, y, { size: 7.5, font: bold, color: SOFT });
  y -= 14;
  const paidLine = [
    `Paid online${pay?.instrument ? ` (${pay.instrument})` : ""} on ${ist(o.paidAt)}`,
    pay?.razorpayPaymentId ? `Payment ID: ${pay.razorpayPaymentId}` : null,
  ].filter(Boolean) as string[];
  paidLine.forEach((l) => {
    text(l, M, y, { size: 9 });
    y -= 12;
  });

  // PAID stamp
  page.drawRectangle({ x: W - M - 92, y: y + 4, width: 92, height: 30, borderColor: LEAF, borderWidth: 2, opacity: 0, borderOpacity: 0.85 });
  text("PAID", W - M - 46 + bold.widthOfTextAtSize("PAID", 16) / 2, y + 13, { size: 16, font: bold, color: LEAF, right: true });

  // Notes
  y -= 22;
  const notes = [
    // Old saved notes may still carry a "[CONFIRM ...]" draft marker; never print it.
    (inv.note ?? "").replace(/\[[^\]]*CONFIRM[^\]]*\]\s*/gi, "").trim() || (taxInvoice ? "" : "Printed books are GST nil-rated (HSN 4901/4903)."),
    "Damaged or wrong book? Reply to your order email within 7 days with a photo and we'll put it right.",
    "This is a computer-generated invoice and needs no signature.",
  ].filter(Boolean);
  notes.forEach((n) =>
    wrap(n, reg, 8, W - 2 * M).forEach((l) => {
      text(l, M, y, { size: 8, color: SOFT });
      y -= 11;
    }),
  );

  // Footer
  hr(M + 18);
  text("Thank you for reading with Gudiya Stories.", M, M + 4, { size: 8.5, color: LEAF, font: bold });
  text(SITE.url.replace(/^https?:\/\//, "").replace(/\/$/, ""), W - M, M + 4, { size: 8.5, color: SOFT, right: true });

  return { filename: `Gudiya-Stories-Invoice-${o.number}.pdf`, bytes: await doc.save() };
}
