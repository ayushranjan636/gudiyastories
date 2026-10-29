import Image from "next/image";
import Link from "next/link";
import { NAV, SITE } from "@/config/site";
import { DeckledDivider } from "@/components/ui/deckled-divider";
import { InlineWordmark } from "./inline-wordmark";

const HELP = [
  { href: "/help/shipping", label: "Shipping" },
  { href: "/help/returns", label: "Returns and refunds" },
  { href: "/help/faq", label: "Questions" },
  { href: "/help/privacy", label: "Privacy" },
  { href: "/help/terms", label: "Terms" },
  { href: "/track", label: "Track an order" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24">
      <DeckledDivider direction="up" />
      <div className="bg-paper-deep">
        <div className="content-grid grid gap-12 pt-14 pb-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Image
              src="/brand/gudiya-stories-lockup.png"
              alt="Gudiya Stories logo: a doll holding an open book, with the words Give wings to imagination"
              width={940}
              height={745}
              className="w-56 mix-blend-multiply"
            />
            <p className="mt-6 max-w-[42ch] text-ink-soft">
              Gudiya Stories is an independent publisher based in Tirupati, Andhra Pradesh. Every book is written, designed and
              checked by {SITE.author}.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-4">
            <div>
              <p className="label-caps text-ink-soft">Shop</p>
              <ul className="mt-4 space-y-2.5">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="hover:text-leaf">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-caps text-ink-soft">Help</p>
              <ul className="mt-4 space-y-2.5">
                {HELP.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="hover:text-leaf">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="md:col-span-3">
            <p className="label-caps text-ink-soft">Write to us</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href={`https://wa.me/${SITE.whatsapp}`} className="hover:text-leaf">
                  WhatsApp {SITE.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="break-all hover:text-leaf">
                  {SITE.email}
                </a>
              </li>
              {SITE.instagram ? (
                <li>
                  <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-leaf">
                    Instagram @{SITE.instagramHandle}
                  </a>
                </li>
              ) : null}
              <li className="text-ink-soft">
                {SITE.city}, {SITE.region}
              </li>
            </ul>
          </div>
        </div>

        <div className="content-grid pb-6" aria-hidden="true">
          <InlineWordmark />
        </div>

        <div className="content-grid flex flex-col gap-2 border-t border-line py-6 text-small text-ink-soft sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Gudiya Stories. Printed in India.</p>
          <p>A book doesn&apos;t need charging.</p>
        </div>
      </div>
    </footer>
  );
}
