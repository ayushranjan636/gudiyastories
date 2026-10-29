import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const api = {
  payments: { fetch: vi.fn(), capture: vi.fn() },
  orders: { fetchPayments: vi.fn(), create: vi.fn() },
};
vi.mock("razorpay", () => ({ default: class { payments = api.payments; orders = api.orders; } }));

import { createHmac } from "node:crypto";
import { createGatewayOrder, paymentMode, settleOrder, settlePayment, verifyCheckoutSignature } from "./gateway";
import { decryptSecret, encryptSecret, keyAllowedHere } from "./credentials";

const pay = (o: Partial<Record<string, unknown>>) => ({ id: "pay_1", order_id: "order_A", amount: 54900, currency: "INR", status: "captured", method: "upi", vpa: "asha@okicici", created_at: 1, ...o });

beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  process.env.RAZORPAY_KEY_SECRET = "s";
  process.env.AUTH_SECRET = "unit-test-secret";
  delete process.env.DATABASE_URL;
  Object.values(api).forEach((g) => Object.values(g).forEach((f) => f.mockReset()));
});

describe("Razorpay keys", () => {
  it("has no online payment without keys", async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(await paymentMode()).toBe("none");
  });

  it("turns on as soon as keys are present", async () => {
    expect(await paymentMode()).toBe("razorpay");
  });

  it("refuses test keys on the live site", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(keyAllowedHere("rzp_test_abc")).toBe(false);
    expect(keyAllowedHere("rzp_live_abc")).toBe(true);
    vi.unstubAllEnvs();
  });

  it("stores secrets encrypted and reads them back", () => {
    const box = encryptSecret("my-secret");
    expect(box).not.toContain("my-secret");
    expect(decryptSecret(box)).toBe("my-secret");
    process.env.AUTH_SECRET = "a-different-secret";
    expect(decryptSecret(box)).toBeNull();
  });

  it("checks the checkout signature with the key secret", async () => {
    const sig = createHmac("sha256", "s").update("order_A|pay_1").digest("hex");
    expect(await verifyCheckoutSignature("order_A", "pay_1", sig)).toBe(true);
    expect(await verifyCheckoutSignature("order_A", "pay_2", sig)).toBe(false);
  });
});

describe("Razorpay payment check", () => {
  it("confirms a captured payment for the exact amount", async () => {
    api.payments.fetch.mockResolvedValue(pay({}));
    const s = await settlePayment("pay_1", "order_A", 54900);
    expect(s).toMatchObject({ state: "captured", paymentId: "pay_1", amountPaise: 54900, instrument: "UPI (asha@okicici)" });
  });

  it("refuses a payment for a different amount", async () => {
    api.payments.fetch.mockResolvedValue(pay({ amount: 100 }));
    expect((await settlePayment("pay_1", "order_A", 54900)).state).toBe("mismatch");
  });

  it("refuses a payment that belongs to another order", async () => {
    api.payments.fetch.mockResolvedValue(pay({ order_id: "order_B" }));
    expect((await settlePayment("pay_1", "order_A", 54900)).state).toBe("mismatch");
  });

  it("captures an authorized payment instead of letting it lapse", async () => {
    api.payments.fetch.mockResolvedValue(pay({ status: "authorized" }));
    api.payments.capture.mockResolvedValue(pay({ status: "captured" }));
    expect((await settlePayment("pay_1", "order_A", 54900)).state).toBe("captured");
    expect(api.payments.capture).toHaveBeenCalledWith("pay_1", 54900, "INR");
  });

  it("finds the successful attempt among failed ones when the browser never reported back", async () => {
    api.orders.fetchPayments.mockResolvedValue({ items: [pay({ id: "pay_f", status: "failed", created_at: 3 }), pay({ id: "pay_ok", created_at: 2 })] });
    expect(await settleOrder("order_A", 54900)).toMatchObject({ state: "captured", paymentId: "pay_ok" });
  });

  it("reports failed / pending when nothing succeeded", async () => {
    api.orders.fetchPayments.mockResolvedValueOnce({ items: [pay({ status: "failed" })] }).mockResolvedValueOnce({ items: [] });
    expect((await settleOrder("order_A", 54900)).state).toBe("failed");
    expect((await settleOrder("order_A", 54900)).state).toBe("pending");
  });

  it("creates the Razorpay order for exactly the stored total, auto-captured", async () => {
    api.orders.create.mockResolvedValue({ id: "order_A", amount: 54900 });
    await createGatewayOrder({ amountPaise: 54900, receipt: "GS-2600001", orderId: "o1" });
    expect(api.orders.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 54900, currency: "INR", payment_capture: true }));
  });
});
