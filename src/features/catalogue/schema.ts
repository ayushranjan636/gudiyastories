import "server-only";
import { SITE } from "@/config/site";

/**
 * schema.org Offer for a book or set, using only facts the shop states elsewhere:
 * price and stock from the catalogue, delivery charges from Admin → Settings,
 * dispatch/delivery times and the returns rule from the Shipping and Returns pages.
 */
export function offerSchema({
  pricePaise,
  available,
  url,
  shipping,
}: {
  pricePaise: number;
  /** Units available; null = stock not tracked (treated as in stock, as the buy button is). */
  available: number | null;
  url: string;
  shipping: { flatRatePaise: number | null; freeFromPaise: number | null };
}) {
  const free = shipping.freeFromPaise != null && pricePaise >= shipping.freeFromPaise;
  const rate = free ? 0 : (shipping.flatRatePaise ?? 0);
  return {
    "@type": "Offer",
    priceCurrency: "INR",
    price: (pricePaise / 100).toFixed(2),
    availability: available === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url,
    seller: { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
      shippingRate: { "@type": "MonetaryAmount", currency: "INR", value: (rate / 100).toFixed(2) },
      // Shipping page: dispatch within 2–3 working days, delivery 3–7 days after dispatch.
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 3, unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 7, unitCode: "DAY" },
      },
    },
    // Returns page: damaged or wrong books, reported within 7 days of delivery, are
    // replaced or refunded in full; no change-of-mind returns.
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnFees: "https://schema.org/FreeReturn",
      merchantReturnLink: `${SITE.url}/help/returns`,
    },
  };
}
