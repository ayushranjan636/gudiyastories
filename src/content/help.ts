// Policy pages. Signed off by the owner (Nov 2026).

// The privacy page mentions Google Analytics only when it is actually switched on.
const GA_ON = /^G-[A-Z0-9]{4,20}$/.test((process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim());

type HelpPage = { title: string; summary: string; draft: boolean; sections: { heading: string; body: string[] }[] };

export const HELP: Record<string, HelpPage> = {
  shipping: {
    title: "Shipping",
    summary: "We pack every order by hand in Tirupati and ship across India.",
    draft: false,
    sections: [
      {
        heading: "Charges",
        body: [
          "Delivery is ₹60 per order, and free on orders of ₹499 or more after any discount.",
          "The exact charge is shown in your bag and at checkout before you pay.",
        ],
      },
      {
        heading: "When it arrives",
        body: [
          "We dispatch within 2–3 working days of your order. Delivery usually takes 3–7 days after dispatch, depending on your PIN code.",
          "We email you at each step: when your order is confirmed, packed, shipped (with the courier name and tracking number) and delivered. You can also follow it on the order page.",
        ],
      },
      {
        heading: "Bulk orders",
        body: ["Orders of 25 copies or more ship on a quote. See the For schools page."],
      },
    ],
  },
  returns: {
    title: "Returns and refunds",
    summary: "If a book arrives damaged or wrong, we'll put it right.",
    draft: false,
    sections: [
      {
        heading: "Damaged or wrong books",
        body: [
          "Message us within 7 days of delivery with your order number and a photo. We'll send a replacement or refund you in full.",
        ],
      },
      {
        heading: "Changed your mind",
        body: ["We can't take back books for a change of mind. Returns and refunds are for books that arrive damaged or wrong."],
      },
      {
        heading: "How refunds work",
        body: [
          "Online payments are refunded to the original method through Razorpay. Banks usually take 5 to 7 working days to show it. We email you when the refund is issued.",
        ],
      },
    ],
  },
  faq: {
    title: "Questions",
    summary: "The things parents and teachers ask us most.",
    draft: false,
    sections: [
      {
        heading: "Which book should I start with?",
        body: [
          "Pick the value you want to talk about first, then the age. The Books page filters by both. If you are unsure, message us your child's age and we'll suggest one.",
        ],
      },
      {
        heading: "Are the ages strict?",
        body: [
          "No. They are a guide to the vocabulary and the length. Younger children often enjoy a book read aloud to them a band above their age.",
        ],
      },
      {
        heading: "How do I pay?",
        body: ["Online at checkout, by UPI, card, netbanking or wallet, through Razorpay. Your order is confirmed the moment the payment goes through, and we email you a receipt. For bulk orders for schools, use the For schools page."],
      },
      {
        heading: "How will I know where my order is?",
        body: ["We email you when it's confirmed, packed, shipped and delivered. The shipping email has the courier and tracking number. You can also check any time on the Track an order page."],
      },
      {
        heading: "Do you sell on Amazon or Flipkart?",
        body: ["Some titles are listed there. Buying here supports the author directly, and the sets are only available on this site."],
      },
    ],
  },
  privacy: {
    title: "Privacy",
    summary: "What we collect, why, and what we never do with it.",
    draft: false,
    sections: [
      {
        heading: "What we collect",
        body: [
          "When you order: your name, phone, email and delivery address. We need these to deliver your books and email you updates about your order.",
          "If you fill in checkout but the payment doesn't go through, we keep those details for up to 90 days and may call or message you once to help you finish the order. Tell us if you'd rather we didn't, and we won't.",
          "When you leave your email for resources: just the email, and only if you choose to.",
        ],
      },
      {
        heading: GA_ON ? "Analytics" : "Analytics without cookies",
        body: [
          "We count visits with our own simple analytics. It sets no cookies and stores no IP addresses. Visits are grouped by a code that changes every day, so they cannot be linked to you over time.",
          ...(GA_ON
            ? [
                "We also use Google Analytics to understand which pages are useful. It sets cookies in your browser and Google receives your visit data. We have turned off advertising features and ad personalisation. You can block it with your browser's privacy settings or Google's opt-out add-on (tools.google.com/dlpage/gaoptout).",
              ]
            : []),
        ],
      },
      {
        heading: "Who sees it",
        body: [
          "Razorpay processes card and UPI payments; we never see your card details. Couriers see your delivery address. Our email provider delivers order emails to you.",
          `We do not sell or share your details with anyone else${GA_ON ? " (apart from the visit data Google Analytics collects, described above)" : ""}.`,
        ],
      },
      {
        heading: "Your choices",
        body: ["Write to us to see, correct or delete what we hold about you. Every marketing email has an unsubscribe link."],
      },
    ],
  },
  terms: {
    title: "Terms",
    summary: "The short version of how buying from us works.",
    draft: false,
    sections: [
      {
        heading: "Prices",
        body: [
          "Prices are in Indian rupees and include all taxes. The MRP printed on each book is shown for comparison. We may change prices, but never on an order you've already placed.",
        ],
      },
      {
        heading: "Orders",
        body: [
          "An order is confirmed when the online payment succeeds. If a book turns out to be out of stock after you've paid, we'll refund that part in full.",
        ],
      },
      {
        heading: "Content",
        body: [
          "All stories, illustrations and designs are © S.V. Bharathi and Gudiya Stories. The free resources may be printed for home and classroom use, not for resale.",
        ],
      },
      {
        heading: "Business details",
        body: ["Gudiya Stories, Flat No. 106, Garuda Tower, Lakshmipuram, Tirupati (Urban), Andhra Pradesh 517501, India."],
      },
    ],
  },
};
