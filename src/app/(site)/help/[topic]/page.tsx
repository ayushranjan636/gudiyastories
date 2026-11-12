import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HELP } from "@/content/help";
import { SITE } from "@/config/site";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { pageMetadata } from "@/lib/seo";

const GA_ON = /^G-[A-Z0-9]{4,20}$/.test((process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim());

type Props = { params: Promise<{ topic: string }> };

// Search descriptions (the on-page summaries are short; these say what the page answers).
const HELP_DESCRIPTIONS: Record<string, string> = {
  shipping: "Gudiya Stories delivery charges, dispatch and delivery times across India: ₹60 per order, free from ₹499, dispatched in 2–3 working days with email tracking.",
  returns: "Book arrived damaged or wrong? Tell Gudiya Stories within 7 days of delivery for a replacement or a full refund to your original payment method.",
  faq: "What parents and teachers ask Gudiya Stories most: which book to start with, how strict the ages are, how to pay, tracking your order and where else we sell.",
  privacy: GA_ON
    ? "What personal data Gudiya Stories collects when you order, why we keep it, who sees it, how we use Google Analytics and the choices you have."
    : "What personal data Gudiya Stories collects when you order, why we keep it, who sees it, our cookie-free analytics and the choices you have.",
  terms: "How buying from Gudiya Stories works: prices, orders and payment, use of our content, and the registered business details of the shop in Tirupati.",
};

export function generateStaticParams() {
  return Object.keys(HELP).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = HELP[(await params).topic];
  if (!h) return {};
  const topic = (await params).topic;
  return pageMetadata({ title: h.title, description: HELP_DESCRIPTIONS[topic] ?? h.summary, path: `/help/${topic}`, noindex: h.draft });
}

export default async function HelpPage({ params }: Props) {
  const { topic } = await params;
  const h = HELP[topic];
  if (!h) notFound();

  return (
    <div className="content-grid grid gap-12 pt-10 md:pt-16 lg:grid-cols-12">
      <nav aria-label="Help" className="lg:col-span-3">
        <ul className="flex flex-wrap gap-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1">
          {Object.entries(HELP).map(([k, v]) => (
            <li key={k}>
              <Link
                href={`/help/${k}`}
                aria-current={k === topic ? "page" : undefined}
                className="block rounded-full px-3 py-1.5 text-small hover:bg-paper-deep aria-[current=page]:bg-ink aria-[current=page]:text-paper lg:rounded-lg"
              >
                {v.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="lg:col-span-8">
        <Breadcrumbs className="mb-6" items={[{ name: h.title, href: `/help/${topic}` }]} />
        <h1 className="text-h2">{h.title}</h1>
        <p className="mt-4 text-lead text-ink-soft">{h.summary}</p>
        <div className="mt-10 space-y-10">
          {h.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-h4">{s.heading}</h2>
              <div className="mt-3 space-y-3 text-ink-soft">
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-14 border-t border-line pt-6 text-small text-ink-soft">
          Still have a question? Message us on{" "}
          <a href={`https://wa.me/${SITE.whatsapp}`} className="text-ink underline underline-offset-4">
            WhatsApp
          </a>{" "}
          or write to{" "}
          <a href={`mailto:${SITE.email}`} className="text-ink underline underline-offset-4">
            {SITE.email}
          </a>
          .
        </p>
      </article>
    </div>
  );
}
