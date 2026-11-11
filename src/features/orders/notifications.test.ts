import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const sent: { to: string; subject: string; html?: string; text: string }[] = [];
let failSend = false;
vi.mock("@/server/email", () => ({
  sendEmail: vi.fn(async (m: { to: string; subject: string; text: string; html?: string }) => {
    if (failSend) return { sent: false };
    sent.push(m);
    return { sent: true };
  }),
}));

type Ev = { orderId: string; message: string };
const events: Ev[] = [];
let order: Record<string, unknown> | null = null;
vi.mock("@/server/db", () => ({
  db: {
    order: { findUnique: async () => order },
    orderEvent: {
      findFirst: async ({ where }: { where: Ev }) => events.find((e) => e.orderId === where.orderId && e.message === where.message) ?? null,
      create: async ({ data }: { data: Ev }) => (events.push(data), data),
    },
  },
}));

import { sendStatusEmail } from "./notifications";

const paid = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  number: "GS-2600001",
  status: "PAID",
  paidAt: new Date(),
  paymentMethod: "RAZORPAY",
  contactName: "Asha Rao",
  contactEmail: "asha@example.com",
  totalPaise: 19000,
  items: [{ quantity: 1, title: "Cheers to Monday" }],
  ...over,
});

beforeEach(() => {
  sent.length = 0;
  events.length = 0;
  failSend = false;
  order = paid();
  process.env.AUTH_SECRET = "t";
});

describe("order update emails", () => {
  it("emails the customer when the order is packed, shipped and delivered", async () => {
    expect(await sendStatusEmail("o1", { kind: "packed" })).toBe("sent");
    expect(await sendStatusEmail("o1", { kind: "shipped", courier: "India Post", trackingNumber: "EE123IN", trackingUrl: "https://example.com/t/EE123IN" })).toBe("sent");
    expect(await sendStatusEmail("o1", { kind: "delivered", reviewUrl: "https://gudiyastories.com/review/abc" })).toBe("sent");
    expect(sent.map((m) => m.subject)).toEqual([
      "Your order GS-2600001 is packed",
      "Your order GS-2600001 is on its way",
      "Your order GS-2600001 was delivered",
    ]);
    expect(sent[1]!.html).toContain("EE123IN");
    expect(sent[1]!.html).toContain("India Post");
    expect(sent[2]!.html).toContain("/review/abc");
    expect(sent.every((m) => m.to === "asha@example.com")).toBe(true);
  });

  it("sends each update only once, even if the button is pressed twice", async () => {
    await sendStatusEmail("o1", { kind: "packed" });
    expect(await sendStatusEmail("o1", { kind: "packed" })).toBe("skipped");
    expect(sent).toHaveLength(1);
  });

  it("sends one email per refund", async () => {
    await sendStatusEmail("o1", { kind: "refunded", refundKey: "r1", amountPaise: 5000, full: false });
    await sendStatusEmail("o1", { kind: "refunded", refundKey: "r1", amountPaise: 5000, full: false });
    await sendStatusEmail("o1", { kind: "refunded", refundKey: "r2", amountPaise: 14000, full: true });
    expect(sent.map((m) => m.subject)).toEqual(["Refund for order GS-2600001: ₹50", "Refund for order GS-2600001: ₹140"]);
  });

  it("never emails about a checkout that was never paid", async () => {
    order = paid({ paidAt: null, status: "EXPIRED" });
    expect(await sendStatusEmail("o1", { kind: "cancelled", refundDue: false })).toBe("skipped");
    expect(sent).toHaveLength(0);
  });

  it("escapes what an admin types, so it can't break the email", async () => {
    await sendStatusEmail("o1", { kind: "cancelled", reason: '<script>alert("x")</script>', refundDue: true });
    expect(sent[0]!.html).not.toContain("<script>");
    expect(sent[0]!.html).toContain("&lt;script&gt;");
  });

  it("notes a failed send on the order and lets the admin action carry on", async () => {
    failSend = true;
    expect(await sendStatusEmail("o1", { kind: "packed" })).toBe("failed");
    expect(events.at(-1)!.message).toMatch(/not sent/);
    failSend = false;
    expect(await sendStatusEmail("o1", { kind: "packed" })).toBe("sent");
  });
});
