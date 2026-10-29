// Draft policy pages. Everything marked CONFIRM is listed in docs/CONTENT-TODO.md
// and must be signed off by the owner before launch.

type HelpPage = { title: string; summary: string; draft: boolean; sections: { heading: string; body: string[] }[] };

export const HELP: Record<string, HelpPage> = {
  shipping: {
    title: "Shipping",
    summary: "We pack every order by hand in Tirupati and ship across India.",
    draft: true,
    sections: [
      {
        heading: "Charges",
        body: [
          "Delivery is ₹60 per order, and free on orders of ₹499 or more after any discount. (CONFIRM both amounts.)",
          "The exact charge is shown in your bag and at checkout before you pay.",
        ],
      },
      {
        heading: "When it arrives",
        body: [
          "We aim to dispatch within [CONFIRM] working days of your order. Delivery usually takes [CONFIRM] days after dispatch, depending on your PIN code.",
          "You'll get the courier name and tracking number by email and on the order page as soon as it ships.",
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
    draft: true,
    sections: [
      {
        heading: "Damaged or wrong books",
        body: [
          "Message us within [CONFIRM] days of delivery with your order number and a photo. We'll send a replacement or refund you in full.",
        ],
      },
      {
        heading: "Changed your mind",
        body: ["[CONFIRM whether unused books can be returned, within how many days, and who pays return shipping.]"],
      },
      {
        heading: "How refunds work",
        body: [
          "Online payments are refunded to the original method through Razorpay. Banks usually take 5 to 7 working days to show it.",
          "Cash on delivery orders are refunded by UPI or bank transfer.",
        ],
      },
    ],
  },
  faq: {
    title: "Questions",
    summary: "The things parents and teachers ask us most.",
    draft: true,
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
        heading: "Can I order on WhatsApp instead?",
        body: ["Yes. Every book page and the checkout have a WhatsApp option. We confirm the order and share payment details in the chat."],
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
    draft: true,
    sections: [
      {
        heading: "What we collect",
        body: [
          "When you order: your name, phone, delivery address and, if you give it, your email. We need these to deliver your books and send updates.",
          "When you leave your email for resources: just the email, and only if you choose to.",
        ],
      },
      {
        heading: "Analytics without cookies",
        body: [
          "We count visits with our own simple analytics. It sets no cookies and stores no IP addresses. Visits are grouped by a code that changes every day, so they cannot be linked to you over time.",
        ],
      },
      {
        heading: "Who sees it",
        body: [
          "Razorpay processes card and UPI payments; we never see your card details. Couriers see your delivery address. We do not sell or share your details with anyone else.",
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
    draft: true,
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
          "An order is confirmed when payment succeeds, or when we confirm a cash on delivery or WhatsApp order. If a book turns out to be out of stock after you've paid, we'll refund that part in full.",
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
        body: ["Gudiya Stories, Tirupati, Andhra Pradesh, India. [CONFIRM full registered address and GSTIN, if any.]"],
      },
    ],
  },
};
