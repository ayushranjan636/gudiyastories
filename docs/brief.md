1. What we are building

A website and online shop for Gudiya Stories, an independent children's book publisher in Tirupati, Andhra Pradesh, India. The founder, author and designer is Ms. S.V. Bharathi, an early-childhood educator with 15+ years of classroom experience and an IB curriculum background. Her awards include the Reliance Foundation Teachers Award with CENTA (TPO 2022), the Dr. A.P.J. Abdul Kalam International Educator's Honor (2020), Dynamic Teacher of the Year (International Education Award, 2020) and Progressive Pre-Primary Coordinator (Global Institute of Training and Development, 2021).

The catalogue has six value-based picture books, three "Focus" mandala/pattern colouring books, and four bundles. Every title has its own ISBN.

The build has two parts:

Public site: a minimal, calm, trustworthy storefront with a few memorable motion moments.
Admin panel at /admin: products, inventory, orders, customers, coupons, blog, downloadable resources, bulk enquiries and analytics.
Who it is for
Parents and grandparents (mostly on mobile, coming from Instagram/WhatsApp) looking for meaningful books for ages 4–13.
Schools, libraries, NGOs and companies running CSR programmes who buy in bulk.
Teachers looking for read-aloud material and discussion prompts.
What makes it different (build the site around these)
Written by a teacher, not a content mill. Bharathi's classroom experience is the main reason to trust the books, so it appears on the home page, every product page and in the footer.
Shop by value first, then age. Kindness, Courage, Family, Nature, Joy, Focus.
"After the story" cards. Every book has a free printable PDF with 3–5 questions a parent or teacher can ask after reading. Downloading it collects an email address (optional, never required).
Look inside before buying. A page-flip preview of 3–4 real spreads per book.
Rooted in a real place. Mystical Landscapes of Donimalai is set in the valley where Bharathi grew up. Tell that story.
Colour, tear, frame, gift. The colouring books have perforated 220gsm pages meant for framing. Show framed pages.
Built for bulk buyers. A dedicated "For schools & CSR" page with tiered pricing, custom bookplates and author reading sessions.
A real book, not a screen. A recurring, understated message about screen-free reading.
2. Tech stack (use exactly this)
Next.js (latest stable, App Router, React Server Components, Server Actions), TypeScript strict mode
Tailwind CSS v4 for the public site, with custom components only (no UI kit on the public site)
shadcn/ui for the admin panel only
PostgreSQL on Supabase + Prisma ORM; Supabase Storage for images and PDFs
Auth.js (NextAuth v5) with email + password for admin users (bcrypt, rate-limited login). Customers check out as guests, with an optional magic-link account to view past orders.
Razorpay for payments (UPI, cards, netbanking, wallets), verified by webhook. Cash on delivery can be switched on or off in admin.
Resend + React Email for transactional email
motion (the Framer Motion package) for animation, plus plain CSS/SVG where that is enough. No scroll-jacking or smooth-scroll libraries.
react-pageflip for the look-inside viewer
Tiptap for the blog editor (store JSON and rendered HTML)
Recharts for admin charts
Zod for every input, react-hook-form for admin forms
Lucide icons, 1.5px stroke, used sparingly
Deploy target: Vercel. Store all secrets in .env; provide a complete .env.example.
3. Brand and visual design
3.1 Logo — do not redesign it

The current logo, which must be kept, is a black-and-white matryoshka doll ("gudiya") with a flower on its body. In front of the doll is an open green book carrying the line "Give Wings To Imagination". A butterfly flies out on the left, and on the right a hand releases a second butterfly. The words "GUDIYA STORIES" arch above in green triple-line (inline) letters, with the handwritten line "Love for books is the best of all" underneath.

Derive three versions from it. Do not redraw it or change its proportions:

Full lockup (doll + arched wordmark + book): footer and About page.
Compact mark (doll + book only): header, favicon, social and OG images.
Wordmark (the triple-line "GUDIYA STORIES" letters alone): large footer signature.

Files are in /public/brand/. If only a PNG is available, use it with next/image and set up the animated-logo component (section 3.5) so it works with a PNG fallback now and a layered SVG later.

Remove the green-gradient background and gold stars from the old site. The logo sits on the paper colour.

3.2 Colour tokens

Define these as CSS variables and Tailwind theme tokens. The colourful book covers carry the colour, so the interface stays quiet.

Token	Value	Use
--paper	
#FBF8F1	Page background
--paper-deep	
#F2EBDD	Alternate sections, cards
--ink	
#1B1A17	Text, the doll's black
--ink-soft	
#5A5650	Secondary text
--line	
#E4DCCB	Hairlines, borders
--leaf	
#2F6B2A	Links, primary buttons, focus rings (text-safe green)
--lime	sample the exact logo green (approx. 
#62D12E)	Decoration only: underlines, small marks, butterfly. Never used for text.
--clay	
#B4532F	Sale price and errors only
Every text/background pair must pass WCAG AA.
Add a subtle paper grain over the whole page: an SVG feTurbulence noise at 3–4% opacity, fixed, with pointer-events: none.
No gradients and no glassmorphism. Shadows are rare and only on books (a soft contact shadow under a cover).
3.3 Typography
Display: "Young Serif" (Google Fonts) for headings and book titles. It is warm and bookish without being twee.
Text and UI: "Hanken Grotesk" (Google Fonts), weights 400/500/600.
No script or handwriting fonts. The only handwriting on the site comes from the logo's own tagline and scans of Bharathi's handwriting (signature, notes), used as images or SVG.
Load fonts with next/font and use a fluid scale: body 17–18px, line-height 1.6, max line length 68ch. Hero heading clamp(2.5rem, 6vw, 5rem) with letter-spacing -0.01em.
Use sentence case everywhere: headings, buttons, navigation. No all-caps buttons, except for small 11–12px tracked labels.
3.4 Layout principles
Generous whitespace on a 12-column grid with a 1200px content width. Book covers can break out of the grid.
Mobile first. Most traffic is mobile: thumb-reachable add-to-bag button, sticky bottom bar on product pages.
Header: compact doll mark on the left; nav (Books, For schools, Free resources, Notes, About); "Bag (2)" as text on the right. The header hides on scroll down and returns on scroll up.
Section dividers use a deckled (torn-paper) edge SVG in --paper-deep, sparingly (2–3 per page at most).
One icon set (Lucide), used only where it aids scanning: delivery, returns, secure payment.
3.5 Signature motion and graphics

Motion should feel like turning pages, not like a tech product. Each effect must have a purpose. All motion respects prefers-reduced-motion; with it on, everything appears in its final state with no movement. Default easing is cubic-bezier(0.22, 1, 0.36, 1); durations are 250–700ms.

Logo line-draw intro (home hero, once per session). The doll's outline draws in using stroke-dashoffset (~900ms). The book fades up, then the left butterfly lifts off and flutters on a gentle curved path to settle beside the headline, where it gently flaps its wings every ~6s. Total under 1.6s, never blocks content, skippable, and shown once per session (sessionStorage). PNG fallback: a soft mask-reveal from the bottom.
Books as objects. Covers render as 3D books: a CSS perspective card with a visible spine and page-edge thickness. On hover (desktop) the book tilts toward the cursor by up to 6° and lifts slightly. On mobile, the book settles into place as it scrolls into view.
Look-inside page flip. react-pageflip in a full-screen sheet, with page-curl shadows and keyboard arrows. On mobile it shows one page at a time with swipe.
Mandala colours itself in. On the colouring-books section, a single mandala SVG starts as line art. As the section scrolls through the viewport, its segments fill one by one with the cover colours (scroll-linked, using useScroll).
Donimalai valley parallax. On the About page and the Donimalai book page: 3–4 layered hill silhouettes (simple SVG shapes in greens and ink) moving at different speeds, with a small group of hikers walking along the ridge. Keep it subtle, under 40px of travel.
Value chips. Selecting a value filter re-sorts the grid with a layout animation (motion layout prop), not a fade-out/fade-in.
Add to bag. A small copy of the cover arcs to the bag in the header, and the bag count ticks up. Under 600ms.
Handwritten signature. In the author section, Bharathi's signature draws itself in once when it scrolls into view.
Text reveals. Headings rise 12px and fade in when they scroll into view, once, with no letter-by-letter typing effects.

Do not use: parallax on body text, cursor trails, marquee tickers, auto-playing carousels, confetti, bouncing CTAs, or loading spinners on the public site (use skeletons).

Performance budget: LCP < 2.0s on 4G mobile, CLS < 0.05, under ~170KB of JavaScript on the home page. Lazy-load the page-flip and mandala code.

4. Writing rules (strict)

The site must not read as AI-generated. The voice is a thoughtful teacher talking to a parent at the school gate: warm, specific, brief.

Short sentences. Concrete details: what happens in the story, which age, how many pages, what the paper is like.
Banned words and phrases: magical, enchanting, embark, journey (unless literal), unlock, unleash, tapestry, delve, captivating, whimsical, treasure trove, "in today's world", "look no further", elevate, curated, seamless, "dive into", "ignite", "spark joy", "a world of", "where X meets Y", "more than just".
No emojis anywhere: UI, emails, toasts, admin, seed data, code comments shown to users.
At most one exclamation mark per page. Avoid em dashes in UI copy; use full stops and commas.
Never invent reviews, testimonials, numbers or awards. Where real content is missing, use a clearly marked placeholder like [REVIEW NEEDED] and list it in docs/CONTENT-TODO.md.
Ages must be consistent everywhere and come only from the product record.
Use Indian conventions: ₹ with Indian digit grouping (₹1,150), "colouring" spelling, DD Month YYYY dates.
Ready-to-use copy

Home hero

Heading: "Books that give children something to talk about."
Sub: "Value-based picture books and mindful colouring books, written and designed by early-years teacher S.V. Bharathi in Tirupati."
Buttons: "Browse the books" (primary), "For schools and gifting" (text link)
Under the buttons, small: "Printed in India · ISBN registered · Ships across India"

Shop by value section — heading: "Choose by what matters to you." One line per value:

Kindness: "For learning to notice how other people feel."
Courage: "For trying the hard thing, and trying again."
Family: "For grandparents, siblings and the people at home."
Nature: "For children who should know where the forest ends."
Joy: "For laughing out loud at bedtime."
Focus: "For slowing down with a pencil and twenty quiet minutes."

Author section — heading: "Written by a teacher who still sits on the small chairs." Body: "Bharathi has spent more than fifteen years in early-years classrooms. She writes for the questions children actually ask, then tests every story by reading it aloud to them. She grew up in Donimalai, a mining town in a green valley in Karnataka, and you will find that valley in her books." Then list the awards plainly, with years.

After the story section — heading: "The book ends. The conversation doesn't have to." Body: "Every book comes with a free printable card of questions to ask once the last page is turned. Written by Bharathi, tested in her classroom."

Colouring section — heading: "Colour it, tear it out, frame it." Body: "Thirty-six perforated pages on 220gsm drawing paper. Thick enough for sketch pens. Made to be given away."

Schools and CSR teaser — heading: "Buying for a classroom, a library or a CSR programme?" Body: "We offer bulk pricing from 25 copies, a printed bookplate with your school or company name, and reading sessions with the author." Button: "Plan a bulk order"

Screen-free line (footer or between sections): "A book doesn't need charging."

Footer note: "Gudiya Stories is an independent publisher based in Tirupati, Andhra Pradesh. Every book is written, designed and checked by S.V. Bharathi."

5. Catalogue seed data

Seed exactly these products. Fields marked CONFIRM must also be listed in docs/CONTENT-TODO.md for the client to check.

SKU	Title	Type	Ages	Values	Pages	Paper/binding	ISBN	Price ₹	MRP ₹	Published
MLD001	Mystical Landscapes of Donimalai	Story	8–13	Nature, Courage	16	300gsm art paper, matte lamination	978-93-340-2851-5	150	199	26 Mar 2024
CTM002	Cheers to Monday	Story	6–8	Kindness, Family	12	same	978-93-340-3675-6	130	179	26 Mar 2024
WW003	Winter Wonderland	Story	7–10	Joy	16	same	978-93-340-3216-1	150	199	26 Mar 2024
PP004	Pitfall Parade	Story	8–12	Courage, Family	16	same	978-93-340-4463-8	150	199	26 Mar 2024
RBB005	Rainbow's Birthday Bash	Story	6–8	Family, Joy	12	same	978-93-340-4105-7	130	179	26 Mar 2024
SL006 (CONFIRM SKU)	Spread Love	Story	6–8	Kindness	16	same	978-93-340-4516-1	180	210	26 Mar 2024
MCB007	Focus: Nature Mandala Colouring Book	Colouring	5+ (CONFIRM)	Focus, Nature	36	220gsm drawing paper, perforated, paperback	978-93-341-9159-2	350	380	26 Dec 2024
FCBP008	Focus: Patterns and Designs, Level 1	Colouring	5–8	Focus	36	same	978-93-341-9605-4	420	450	26 Dec 2024
FCB0010	Focus: Fruits and Vegetables Mandala Colouring Book	Colouring	5+ (CONFIRM)	Focus, Nature	36	same	978-93-342-5137-1	420	450	26 Dec 2024

Author for all: S.V. Bharathi. Publisher: Gudiya Stories. Language: English. Country of origin: India.

Short descriptions (use as written):

Donimalai: "Rani and her friends hike into the Donimalai valley and find it needs looking after. A story about courage, working as a team, and leaving a forest cleaner than you found it."
Cheers to Monday: "A girl and her mother get ready for a new school week. A gentle story for children who find Mondays hard, and an easy way into talking about saying goodbye at the school gate."
Winter Wonderland: "Santa takes the children to the North Pole for a winter of snow and silly jokes. A light, funny read for the festive season."
Pitfall Parade: "Three siblings set out on a bike ride and discover halfway down the hill that the brakes don't work. About taking risks, not giving up, and getting each other home."
Rainbow's Birthday Bash: "It's Rainbow the unicorn's birthday, with grandparents, friends and far too many balloons. A story about family, being happy with what you have, and staying humble."
Spread Love: "Lolly and Polly are twin birds who look exactly alike and think nothing alike. A story about respecting differences and lifting each other up."
Nature Mandala: "Leaves, birds and flowers drawn as mandalas, from simple to detailed. Thirty-six perforated pages to colour, tear out and frame."
Patterns and Designs, Level 1: "Repeating shapes, sorting by size and pattern-building, disguised as colouring. Early maths thinking for ages 5 to 8."
Fruits and Vegetables Mandala: "Everyday fruits and vegetables turned into mandalas. A calm way to practise colour, shape and fine motor control."

Bundles. In the client's current sheet, every bundle costs more than buying the same books separately. Seed these corrected prices (CONFIRM), and make the bundle page always show "You save ₹X compared with buying separately", calculated live:

SKU	Bundle	Contents	Price ₹ (suggested)	Sum of singles ₹	MRP ₹
SET-ADV3	Adventure set of 3	Donimalai, Winter Wonderland, Pitfall Parade	399	450	597
SET-KIND3	Kindness set of 3	Cheers to Monday, Rainbow's Birthday Bash, Spread Love	399	440	568
SET-ALL6	Complete story collection	All six story books	799	890	1,165
SET-FOCUS3	Focus colouring set	All three colouring books	1,099	1,190	1,280

Bundle stock is never stored. It is calculated as the minimum available stock of its component books.

Also seed: 3 sample "Notes" (blog) posts marked as drafts with [DRAFT – REPLACE] titles, one "After the story" PDF placeholder per book, and an admin user taken from .env (ADMIN_EMAIL, ADMIN_PASSWORD).

6. Public site — pages
Home /: hero with logo animation → shop by value → featured books (3D covers) → author → after-the-story → colouring section with the mandala → Donimalai teaser → schools/CSR teaser → latest 3 Notes → trust strip (shipping time, returns, secure payment, ISBN) → footer.
Books /books: filter by value chips, age (4–6, 6–8, 8–10, 10+) and type (story, colouring, sets); sort by recommended, price or newest. Filters live in the URL (?value=kindness&age=6-8). Use an empty state with a helpful line, not a sad face.
Book page /books/[slug]: large 3D cover and gallery; title, ages, values, page count, paper, ISBN; price with MRP struck through; quantity; "Add to bag" plus "Order on WhatsApp" (opens wa.me with the title, SKU and price pre-filled); look inside; "After the story" free download; "What it's about"; "Good for" (situations, e.g. "first week of school"); "Also on Amazon / Flipkart" links when present; reviews (only real, approved ones); "Often read together" (bundle upsell); sticky bottom bar on mobile. Product JSON-LD (Book with ISBN, author, offers).
Bundle page: shows the books inside it, savings and stock.
For schools and CSR /for-schools: price tiers (25+, 100+, 500+ copies; configurable in admin), custom bookplate, author sessions (in person in Andhra Pradesh/Karnataka, online elsewhere), sample-pack request, and an enquiry form (organisation, type, city, quantity, titles, budget, timeline, contact). Submissions create an Enquiry in admin and email the owner.
Free resources /resources: after-the-story cards, free colouring pages and reading tips. Email capture is optional ("Email me new resources", unticked by default).
Notes /notes and /notes/[slug]: the blog ("Notes from the classroom"), with categories, reading time, author box, related books at the end, and BlogPosting JSON-LD.
About /about: Bharathi's story, the Donimalai parallax, awards, and how a book is made (write → test in class → illustrate → print).
Bag, checkout, order confirmation, order tracking /track (order number + phone).
Help: shipping, returns and refunds, privacy, terms, FAQ, contact. Policies are written for an Indian small business and marked [REVIEW BY OWNER]. Razorpay needs these pages live before it approves the account.
404 page: a short line ("This page wandered off. The books are still here.") and a link to /books.
Checkout
One page. Steps: contact (name, phone, optional email), address (Indian PIN code auto-fills city/state via a PIN lookup, cached), delivery (shipping rules from admin), payment (Razorpay or COD if enabled).
Coupon field. Free-shipping threshold progress shown in the bag ("Add ₹120 more for free delivery").
Stock is checked when the order is created. On successful payment (verified by webhook) the order becomes PAID and stock is deducted. Pending orders expire after 30 minutes.
Emails: order confirmation, shipped (with tracking link), delivered, cancelled/refunded. Plain, branded, no emojis.
7. Admin panel (/admin)

Protected by middleware. Roles: OWNER (everything) and STAFF (orders, inventory, blog; no settings, users or financial exports). Every create, update and delete is written to an AuditLog. Sidebar layout built with shadcn/ui, responsive enough to use on a phone for packing orders.

7.1 Dashboard
KPI tiles for the selected range (today / 7d / 30d / 90d / custom), each compared with the previous period: revenue, orders, average order value, units sold, conversion rate, new customers.
Revenue and orders over time (line chart), sales by channel (website, WhatsApp, Amazon, Flipkart, bulk/offline), top products by units and revenue, sales by value theme, orders by state (top 10 list).
Funnel: sessions → product views → add to bag → checkout started → paid.
Panels to act on: low-stock list, orders waiting to be packed, new bulk enquiries, reviews awaiting approval.
7.2 Products
List with search, filters (type, status, stock level) and bulk actions (publish, unpublish, archive).
Editor: title, slug (auto), SKU, type (STORY / COLOURING / BUNDLE), short and long description (Tiptap), ages (min/max), values (multi-select), pages, binding, paper, ISBN, publication date, price, MRP, cost price (for margin reports), weight and dimensions (for shipping), HSN code, images (drag to reorder; alt text required before publishing), look-inside spreads, after-the-story PDF, Amazon/Flipkart URLs and marketplace SKUs, SEO title and description with a live Google preview, status (DRAFT / ACTIVE / ARCHIVED), featured toggle.
Bundle editor: pick component products and quantities. Shows live "sum of singles" and savings, and warns if the bundle price is not lower than the sum of singles.
Writing check: show a warning in the editor if the description contains any banned word from section 4.
7.3 Inventory
Table: product, SKU, on hand, reserved, available, low-stock threshold, last movement.
Stock movements (append-only ledger): RESTOCK, SALE_WEBSITE, SALE_MARKETPLACE, SALE_OFFLINE, RETURN, DAMAGED, ADJUSTMENT. Each records quantity, reason, note, user and time. On-hand stock is always the sum of the ledger.
"Record marketplace or offline sale": a quick form so Amazon, Flipkart and book-fair sales reduce stock and show up in analytics by channel.
Low-stock email alert to the owner (daily digest, threshold per product).
CSV import/export for stock counts.
7.4 Orders
List with status tabs (Pending payment, Paid, Packed, Shipped, Delivered, Cancelled, Returned, Refunded), search by order number, name or phone, and filters by date, channel and payment method.
Order detail: items, totals, coupon, customer, address, payment record (Razorpay IDs, method), status timeline, internal notes.
Actions: mark packed, add courier and tracking number (marks shipped and emails the customer), mark delivered, cancel (restocks), refund (through the Razorpay API, full or partial; restocks optionally).
Printable packing slip and invoice PDF. Printed books are generally GST nil-rated in India (HSN 4901/4903), so generate a "Bill of Supply". Make the document type and GST fields configurable in settings and note [CONFIRM WITH CA].
"Create manual order" for WhatsApp, phone and bulk orders (channel field), with an optional Razorpay payment link.
Bulk select → print packing slips / export CSV.
WhatsApp button on each order: opens wa.me/<customer phone> with a pre-filled status message.
7.5 Customers
List with order count, total spent and last order; detail page with order history and addresses; CSV export. Track marketing consent separately from transactional email.
7.6 Coupons
Percentage or fixed amount, minimum order, start/end dates, usage limit (total and per customer), product/value restrictions, first-order-only flag. Usage stats per coupon.
7.7 Notes (blog)
Tiptap editor: headings, lists, quotes, images (with required alt text), embedded product cards (pick a book → renders a mini 3D cover with price and "Add to bag"), callout box, and YouTube embed.
Fields: title, slug, excerpt, cover image, category, tags, related products, SEO title and description, OG image (auto-generated if empty).
Status: draft, scheduled (publish at date/time), published. Preview link for drafts. Revision history (last 10 versions).
7.8 Resources
Upload PDFs and images, attach them to products, toggle "email capture" per resource, and see download counts.
7.9 Bulk enquiries (simple CRM)
Pipeline view: New → Contacted → Sample sent → Quoted → Won / Lost. Notes and next-follow-up date per enquiry, "Convert to manual order", and an email reminder on follow-up dates.
7.10 Reviews
Customers can review a book after delivery (via an emailed link tied to the order, so every review is a verified purchase). Admin approves, hides or replies. Only approved reviews are shown on the site.
7.11 Analytics
Use first-party, cookie-free analytics stored in Postgres, so no cookie banner is needed. Session ID = a hash of (daily salt + IP + user agent); never store raw IPs.
Events: page_view, product_view, add_to_bag, checkout_started, purchase, whatsapp_click, resource_download, enquiry_submitted, look_inside_opened. Record referrer source and UTM parameters.
Reports: traffic over time, top pages, top referrers/UTMs (to see which Instagram posts sell), device split, funnel, product conversion (views → bag → purchase per product), resource downloads, and margin by product (using cost price).
Every report can be exported as CSV.
7.12 Settings (OWNER only)
Store details, contact phone and WhatsApp number (stored in E.164 format, +91…), email, address, hours (or "online only" toggle).
Shipping rules: flat rate, free-shipping threshold, COD on/off with optional COD fee, serviceable PIN codes (optional).
Bulk price tiers for the schools page. Invoice/tax settings. Low-stock defaults. Social links. Admin users and roles.
8. Data model (Prisma, at minimum)

AdminUser, Customer, Address, Product (with type enum), ProductImage, Spread (look-inside pages), Value, ProductValue, BundleItem, StockMovement, Order, OrderItem (snapshot title/price/SKU at purchase), Payment, Shipment, Refund, Coupon, CouponRedemption, Review, Post, PostRevision, Category, Tag, Resource, ResourceDownload, Enquiry, EnquiryNote, Subscriber, AnalyticsEvent, Setting (key/value JSON), AuditLog.

Money is stored as integer paise. All timestamps are UTC and displayed in Asia/Kolkata.

9. Quality bar
Accessibility: WCAG 2.2 AA, visible focus rings in --leaf, everything keyboard-operable (including page flip and filters), semantic landmarks, form errors linked to their fields.
SEO: metadata on every page, canonical URLs, sitemap.xml, robots.txt, JSON-LD (Organization, Book, Product/Offer, BlogPosting, BreadcrumbList), and dynamic OG images (next/og) showing the book cover on paper colour with the compact mark.
Security: Zod validation on every server action and route; Razorpay signature verification; webhook idempotency (store processed event IDs); rate limiting on login, checkout and forms; CSRF protection via server actions; admin routes and server actions check role on the server, not just in the UI.
Images: next/image with Supabase loader, AVIF/WebP, explicit sizes, blur placeholders.
Tests: unit tests for pricing, coupons, bundle stock and stock ledger math (Vitest); one Playwright happy-path test for checkout with Razorpay test mode and one for creating a product in admin.
Code: feature folders, no any, server-only modules for DB access, a README with setup steps.