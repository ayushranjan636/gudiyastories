"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Lock, MessageCircle } from "lucide-react";
import { useBag } from "@/features/bag/bag-context";
import { lookupPin, placeOrder, quoteCheckout, verifyPayment, type Quote } from "@/features/checkout/actions";
import { TextArea, TextInput, Checkbox } from "@/components/ui/field";
import { Button, buttonStyles } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { track } from "@/features/analytics/track";
import { cn } from "@/lib/cn";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutForm() {
  const { items, ready, clear } = useBag();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [method, setMethod] = useState<"RAZORPAY" | "COD" | "WHATSAPP">("RAZORPAY");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const startedRef = useRef(false);
  const [refresh, setRefresh] = useState(0);

  const lines = items.map((i) => ({ slug: i.slug, quantity: i.quantity }));
  const key = JSON.stringify(lines) + appliedCoupon + method + refresh;

  useEffect(() => {
    if (!ready || !lines.length) return;
    let live = true;
    quoteCheckout({ lines, coupon: appliedCoupon, cod: method === "COD" }).then((q) => {
      if (!live) return;
      setQuote(q);
      if (!q.canPayOnline && method === "RAZORPAY") setMethod(q.codAvailable ? "COD" : "WHATSAPP");
    });
    if (!startedRef.current) {
      startedRef.current = true;
      track("checkout_started");
    }
    return () => {
      live = false;
    };
  }, [key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-paper-deep" />;

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-20 text-center">
        <p className="font-display text-h3">Your bag is empty.</p>
        <Link href="/books" className={buttonStyles({ className: "mt-6" })}>
          Browse the books
        </Link>
      </div>
    );
  }

  async function onPin(pin: string) {
    if (!/^[1-9]\d{5}$/.test(pin)) return;
    const r = await lookupPin(pin);
    if (r) {
      setCity((c) => c || r.city);
      setState((s) => s || r.state);
    }
  }

  function submit(form: HTMLFormElement) {
    const f = new FormData(form);
    const input = {
      lines,
      name: String(f.get("name") ?? ""),
      phone: String(f.get("phone") ?? ""),
      email: String(f.get("email") ?? ""),
      line1: String(f.get("line1") ?? ""),
      line2: String(f.get("line2") ?? ""),
      landmark: String(f.get("landmark") ?? ""),
      city: String(f.get("city") ?? ""),
      state: String(f.get("state") ?? ""),
      pinCode: String(f.get("pinCode") ?? ""),
      note: String(f.get("note") ?? ""),
      coupon: appliedCoupon,
      method,
      marketing: f.get("marketing") === "on",
      // The exact total on screen. The server refuses to charge anything different.
      expectedTotalPaise: quote?.totalPaise ?? -1,
    };
    setFormError(null);
    start(async () => {
      const res = await placeOrder(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        if (res.priceChanged) setRefresh((n) => n + 1);
        document.getElementById("checkout-error")?.focus();
        return;
      }
      setErrors({});
      if (res.kind === "whatsapp") {
        track("whatsapp_click", { meta: { from: "checkout" } });
        window.open(res.url, "_blank", "noopener");
        return;
      }
      if (res.kind === "cod") {
        clear();
        router.push(`/order/${res.orderNumber}?placed=1&t=${res.token}`);
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setFormError("The payment window could not load. Check your connection, or order on WhatsApp.");
        return;
      }
      const rzp = new window.Razorpay({
        key: res.keyId,
        amount: res.amountPaise,
        currency: "INR",
        name: "Gudiya Stories",
        description: `Order ${res.orderNumber}`,
        order_id: res.gatewayOrderId,
        prefill: { name: res.name, email: res.email, contact: res.phone },
        theme: { color: "#2F6B2A" },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await verifyPayment(r);
          clear();
          router.push(`/order/${res.orderNumber}?placed=1&t=${res.token}${v.ok ? "" : "&verify=pending"}`);
        },
        modal: { ondismiss: () => setFormError("Payment was not completed. Your bag is still here when you are ready.") },
      });
      rzp.on("payment.failed", () => setFormError("The payment didn't go through. You can try again or pick another way to pay."));
      rzp.open();
    });
  }

  const methods = [
    quote?.canPayOnline
      ? {
          id: "RAZORPAY" as const,
          title: "Pay online",
          text: "UPI, cards, netbanking or wallets, through Razorpay.",
        }
      : null,
    quote?.codAvailable ? { id: "COD" as const, title: "Cash on delivery", text: "Pay when the books arrive." } : null,
    { id: "WHATSAPP" as const, title: "Order on WhatsApp", text: "We confirm the order and share payment details in chat." },
  ].filter((m) => m !== null);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-12 lg:grid-cols-12"
    >
      <div className="space-y-10 lg:col-span-7">
        {formError ? (
          <p id="checkout-error" tabIndex={-1} role="alert" className="rounded-xl bg-clay/10 px-4 py-3 font-medium text-clay">
            {formError}
          </p>
        ) : null}

        <fieldset className="space-y-5">
          <legend className="font-display text-h3">Contact</legend>
          <TextInput label="Full name" name="name" autoComplete="name" required error={errors.name} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required error={errors.phone} hint="For delivery updates." />
            <TextInput label="Email" name="email" type="email" autoComplete="email" optional error={errors.email} hint="For your receipt." />
          </div>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="font-display text-h3">Delivery address</legend>
          <TextInput label="House, flat and street" name="line1" autoComplete="address-line1" required error={errors.line1} />
          <TextInput label="Area or locality" name="line2" autoComplete="address-line2" optional />
          <div className="grid gap-5 sm:grid-cols-3">
            <TextInput
              label="PIN code"
              name="pinCode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              required
              error={errors.pinCode}
              onChange={(e) => void onPin(e.target.value)}
            />
            <TextInput label="City" name="city" autoComplete="address-level2" required value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} />
            <label className="flex flex-col gap-1.5">
              <span className="text-small font-medium">State</span>
              <input
                name="state"
                list="states"
                autoComplete="address-level1"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                aria-invalid={Boolean(errors.state) || undefined}
                className={cn("h-12 rounded-xl border bg-white/70 px-4", errors.state ? "border-clay" : "border-line")}
              />
              <datalist id="states">
                {STATES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {errors.state ? <span className="text-small font-medium text-clay">{errors.state}</span> : null}
            </label>
          </div>
          <TextInput label="Landmark" name="landmark" optional />
          <TextArea label="Note for us" name="note" optional rows={2} hint="A gift message, or anything about delivery." />
        </fieldset>

        <fieldset>
          <legend className="font-display text-h3">How would you like to pay?</legend>
          <div className="mt-5 grid gap-3">
            {methods.map((m) => (
              <label
                key={m.id}
                className={cn(
                  "flex cursor-pointer gap-4 rounded-2xl border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf",
                  method === m.id ? "border-leaf bg-leaf/5" : "border-line hover:border-ink/30",
                )}
              >
                <input type="radio" name="method" className="mt-1 size-4 accent-leaf" checked={method === m.id} onChange={() => setMethod(m.id)} />
                <span>
                  <span className="block font-medium">{m.title}</span>
                  <span className="block text-small text-ink-soft">{m.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Checkbox name="marketing" label="Email me when a new book or free resource comes out" hint="Optional. You can unsubscribe at any time." />
      </div>

      <aside className="lg:col-span-5">
        <div className="sticky top-24 rounded-2xl bg-paper-deep p-6">
          <h2 className="font-display text-h4">Your order</h2>
          <ul className="mt-5 space-y-4">
            {items.map((i) => (
              <li key={i.slug} className="flex items-center gap-4">
                <div className="relative">
                  <Image src={i.product.cover.src} alt="" width={i.product.cover.width} height={i.product.cover.height} className="w-12 rounded-[2px]" />
                  <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-ink text-[0.7rem] text-paper">
                    {i.quantity}
                  </span>
                </div>
                <p className="flex-1 text-small leading-snug">{i.product.title}</p>
                <p className="text-small tabular-nums">{formatINR(i.lineTotalPaise)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex gap-2">
            <label className="sr-only" htmlFor="coupon">
              Discount code
            </label>
            <input
              id="coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Discount code"
              className="h-11 min-w-0 flex-1 rounded-full border border-line bg-white/70 px-4 text-small uppercase"
            />
            <Button type="button" variant="secondary" size="sm" className="h-11" onClick={() => setAppliedCoupon(coupon.trim())}>
              Apply
            </Button>
          </div>
          {quote?.couponError && appliedCoupon ? <p className="mt-2 text-small text-clay">{quote.couponError}</p> : null}

          <dl className="mt-6 space-y-2 border-t border-line pt-5 text-small">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{quote ? formatINR(quote.subtotalPaise) : "…"}</dd>
            </div>
            {quote?.discountPaise ? (
              <div className="flex justify-between text-leaf">
                <dt>Discount ({appliedCoupon})</dt>
                <dd className="tabular-nums">-{formatINR(quote.discountPaise)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="tabular-nums">{quote ? (quote.shippingPaise ? formatINR(quote.shippingPaise) : "Free") : "…"}</dd>
            </div>
            {quote?.codFeePaise ? (
              <div className="flex justify-between">
                <dt>Cash on delivery fee</dt>
                <dd className="tabular-nums">{formatINR(quote.codFeePaise)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="font-display text-h3 tabular-nums">{quote ? formatINR(quote.totalPaise) : "…"}</dd>
            </div>
          </dl>
          {quote?.problems.length ? <p className="mt-3 text-small font-medium text-clay">{quote.problems.join(" ")}</p> : null}

          <Button type="submit" size="lg" disabled={pending || !quote || quote.problems.length > 0} className="mt-6 w-full">
            {pending ? (
              "Working…"
            ) : method === "WHATSAPP" ? (
              <>
                <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> Send order on WhatsApp
              </>
            ) : method === "COD" ? (
              "Place order"
            ) : (
              <>
                <Lock className="size-4" strokeWidth={1.5} aria-hidden="true" /> Pay {quote ? formatINR(quote.totalPaise) : ""}
              </>
            )}
          </Button>
          <p className="mt-3 text-center text-small text-ink-soft">
            By ordering you agree to our{" "}
            <Link href="/help/terms" className="underline underline-offset-2">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/help/returns" className="underline underline-offset-2">
              returns policy
            </Link>
            .
          </p>
        </div>
      </aside>
    </form>
  );
}
