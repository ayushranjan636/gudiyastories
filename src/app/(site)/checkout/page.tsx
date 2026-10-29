import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="content-grid pt-10 md:pt-14">
      <h1 className="text-h2">Checkout</h1>
      <p className="mt-2 text-ink-soft">One page, three short steps.</p>
      <div className="mt-10">
        <CheckoutForm />
      </div>
    </div>
  );
}
