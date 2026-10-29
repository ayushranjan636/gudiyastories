// Store details, taken from the existing gudiyastories site. Delivery charges
// set in Admin > Settings override the two shipping defaults below.
export const SITE = {
  name: "Gudiya Stories",
  tagline: "Give wings to imagination",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "svbharathi@gudiyastories.com",
  phoneDisplay: "+91 63012 79758",
  phoneE164: "+916301279758",
  whatsapp: "916301279758",
  city: "Tirupati",
  region: "Andhra Pradesh",
  country: "India",
  author: "S.V. Bharathi",
  instagram: "https://www.instagram.com/gudiyastories/",
  instagramHandle: "gudiyastories",
  // Free delivery threshold and flat rate. [CONFIRM] in docs/CONTENT-TODO.md.
  freeShippingFromPaise: 49900,
  flatShippingPaise: 6000,
} as const;

export const NAV = [
  { href: "/books", label: "Books" },
  { href: "/classes", label: "Classes" },
  { href: "/for-schools", label: "For schools" },
  { href: "/resources", label: "Free resources" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
] as const;

export function whatsappLink(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}
