import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/server/whatsapp", () => ({ sendOrderWhatsApp: vi.fn(async () => {}) }));

// Fake email service: records every email and can be told to fail.
const sent: { to: string; subject: string; text: string }[] = [];
let failNext = 0;
vi.mock("@/server/email", () => ({
  ownerEmail: () => "owner@gudiya.test",
  sendEmail: vi.fn(async (m: { to: string; subject: string; text: string }) => {
    if (failNext > 0) {
      failNext--;
      return { sent: false };
    }
    sent.push(m);
    return { sent: true };
  }),
}));

// A tiny in-memory stand-in for the order table.
type O = Record<string, unknown> & { id: string; status: string; customerEmailedAt: Date | null; ownerEmailedAt: Date | null };
const orders = new Map<string, O>();
vi.mock("@/server/db", () => ({
  db: {
    order: {
      findUnique: async ({ where }: { where: { id: string } }) => orders.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<O> }) => Object.assign(orders.get(where.id)!, data),
      findMany: async () => [...orders.values()].filter((o) => !["PENDING_PAYMENT", "EXPIRED"].includes(o.status) && (!o.customerEmailedAt || !o.ownerEmailedAt)),
    },
  },
}));

import { retryOrderEmails, sendOrderEmails } from "./service";

const order = (over: Partial<O> = {}): O => ({
  id: "o1",
  number: "GS-2600001",
  status: "PAID",
  contactName: "Asha Rao",
  contactEmail: "asha@example.com",
  contactPhone: "+919876543210",
  shipName: "Asha Rao",
  shipLine1: "1 Temple St",
  shipLine2: null,
  shipCity: "Tirupati",
  shipState: "Andhra Pradesh",
  shipPinCode: "517501",
  customerNote: null,
  items: [{ quantity: 1, title: "Cheers to Monday", lineTotalPaise: 13000 }],
  payments: [{ status: "CAPTURED", amountPaise: 19000, razorpayPaymentId: "pay_123" }],
  discountPaise: 0,
  couponCode: null,
  shippingPaise: 6000,
  codFeePaise: 0,
  totalPaise: 19000,
  paymentMethod: "RAZORPAY",
  customerEmailedAt: null,
  ownerEmailedAt: null,
  ...over,
});

beforeEach(() => {
  sent.length = 0;
  failNext = 0;
  orders.clear();
  process.env.AUTH_SECRET = "t";
});
afterEach(() => vi.clearAllMocks());

describe("order emails", () => {
  it("sends one confirmation to the customer and one notice to the shop after payment", async () => {
    orders.set("o1", order());
    await sendOrderEmails("o1");
    expect(sent.map((m) => m.to)).toEqual(["asha@example.com", "owner@gudiya.test"]);
    expect(sent[0]!.subject).toBe("Order GS-2600001 confirmed");
    expect(sent[1]!.subject).toContain("New order GS-2600001");
    expect(sent[1]!.text).toContain("+919876543210");
    expect(sent[1]!.text).toContain("/admin/orders/o1");
  });

  it("never emails anyone for an unpaid checkout", async () => {
    orders.set("o1", order({ status: "PENDING_PAYMENT" }));
    await sendOrderEmails("o1");
    orders.set("o1", order({ status: "EXPIRED" }));
    await sendOrderEmails("o1");
    expect(sent).toHaveLength(0);
  });

  it("never sends the same email twice (browser, webhook and payment check all confirm)", async () => {
    orders.set("o1", order());
    await sendOrderEmails("o1");
    await sendOrderEmails("o1");
    await sendOrderEmails("o1");
    expect(sent).toHaveLength(2);
  });

  it("retries an email that failed the first time, and only that one", async () => {
    orders.set("o1", order());
    failNext = 1; // the customer's email fails, the shop's goes through
    await sendOrderEmails("o1");
    expect(sent.map((m) => m.to)).toEqual(["owner@gudiya.test"]);
    sent.length = 0;
    await retryOrderEmails();
    expect(sent.map((m) => m.to)).toEqual(["asha@example.com"]);
  });
});
