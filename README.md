# Gudiya Stories

Website, shop and admin panel for Gudiya Stories, an independent children's book publisher in Tirupati. The full brief is in [docs/brief.md](docs/brief.md); content still needed from the client is in [docs/CONTENT-TODO.md](docs/CONTENT-TODO.md).

## Stack

Next.js 16 (App Router, RSC, Server Actions) · TypeScript strict · Tailwind CSS v4 · PostgreSQL + Prisma 7 · local disk or Cloudflare R2 / S3 file storage · Auth.js v5 · Razorpay · Resend · motion · react-pageflip · Tiptap · Recharts · Zod · Lucide. Fonts (Young Serif, Hanken Grotesk) are self-hosted in `src/app/fonts` under the SIL Open Font License.

## Run it on your computer

Requires Node 22 (see `.nvmrc`). In the project folder:

```bash
npm install        # first time only
npm run local
```

That one command starts a local database (Prisma's built-in Postgres, nothing else to install), creates `.env`, the tables and the sample data the first time, then starts the site.

| | |
| --- | --- |
| Site | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| Admin email | `admin@gudiyastories.local` |
| Admin password | `GudiyaAdmin@2026` |
| Payments | off (COD / WhatsApp) until Razorpay keys are added in Admin → Settings → Online payments |

These are local-only details. Change the password in Admin → Settings → Your password, and use your own `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the live site.

Stop with Ctrl+C; run `npm run local` again any time.

**Can't sign in?** Run `npm run admin:reset`. It checks the database, sets up anything missing, resets the login to the one in `.env` and prints it. Payments: see [docs/PAYMENTS.md](docs/PAYMENTS.md).

### Using your own database instead

```bash
cp .env.example .env                 # fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:deploy                    # creates the tables, and the first time adds books, settings and the owner login
npm run dev
```

### Turning things on

| Feature | What to set |
| --- | --- |
| Online payments | Paste your Razorpay keys in Admin → Settings → Online payments (or set them in `.env`). Real payments start at once. The live site accepts live keys only. See [docs/PAYMENTS.md](docs/PAYMENTS.md). |
| WhatsApp confirmations | Optional: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ORDER_TEMPLATE` (Meta WhatsApp Cloud API) |
| Cash on delivery | Admin → Settings → Delivery and payment |
| Image uploads in admin | Locally nothing: saved to `storage/uploads`. Live site: Cloudflare R2, see [docs/STORAGE.md](docs/STORAGE.md) |
| Emails (orders, shipping, enquiries, review links) | `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL` |
| Scheduled jobs (payment check, expiring unpaid orders, low-stock and follow-up email) | `CRON_SECRET`; on Netlify they run by themselves (`netlify.toml`) |

Until a feature is configured, the site falls back gracefully (WhatsApp ordering, paste-an-address images, no emails).

## Go live (free): Netlify + Supabase + Cloudflare R2

Step by step, with every setting: **[docs/DEPLOY-NETLIFY.md](docs/DEPLOY-NETLIFY.md)**.

- **Netlify** runs the site and admin, and deploys every push to `main`. Each build first updates the database (`npm run db:deploy`).
- **Supabase** (Mumbai) holds the database.
- **Cloudflare R2** holds the uploads. The admin's browser uploads straight to R2, so large videos never hit Netlify's request limits.
- **Razorpay:** paste live keys in Admin → Settings → Online payments.
- **Checks:** `/api/health` reports whether the site and database are up. `/robots.txt` and `/sitemap.xml` are generated.

## Online classes

Admin → Classes. Each class has a name, a one-line summary, a picture or video (drag it in, or paste a YouTube link), topics, an "About" text, start date, duration, timings, fee, and the Google Form link that every Enquire button opens. Status: Draft (hidden), Published, or Published with enquiries closed.

- Public pages: `/classes` and `/classes/[slug]`, plus a section on the home page.
- Home-page pop-up: switch it on for one class (the switch in the list, or the tick box in the editor). Turning it on for one turns it off for the others. Visitors see it once per visit, a few seconds after the page settles; once closed it stays away for three days.
- Clicks on Enquire are counted as `class_enquiry` events in Analytics.

Uploads (classes, blog, products) take images up to 15 MB and MP4/WebM/MOV videos up to 200 MB, by drag and drop or by choosing a file. In the blog and class editors you can also drop or paste pictures and videos straight into the text.

## What's where

```
src/app/page.tsx              home page (hero, shelf, values, author, mandala, valley…)
src/app/(site)/               every other public page: books, sets, checkout, schools, blog, help…
src/app/admin/                admin panel (login, dashboard, orders, products, inventory, blog,
                              enquiries, customers, coupons, reviews, analytics, settings)
src/app/api/                  analytics events, Razorpay webhook (optional), scheduled jobs, Auth.js
src/components/home/          the signature pieces: hero arch + butterfly, bookshelf, mandala, valley
src/features/                 catalogue, bag, checkout, orders, blog, payments, analytics…
src/server/                   database access, auth guard, reports, settings, email, storage
prisma/                       schema (4 files), migrations, seed data
netlify/functions/            scheduled jobs (payment check every 5 minutes, daily email)
public/books, public/videos   web-sized covers, inside pages and videos (originals: assets-inbox/originals, not in git)
```

## How things work

- **Money** is integer paise everywhere. Format with `formatINR`.
- **Stock** is never stored: it is the sum of the `StockMovement` ledger. Website orders, manual orders, Amazon/Flipkart/book-fair sales, restocks, returns and corrections are all ledger lines. A set's stock is the minimum of its books.
- **Orders** move Pending payment → Confirmed → Packed → Shipped → Delivered. Stock is deducted once, when payment is confirmed (or a COD order is placed). Online payments are confirmed only after the server fetches the payment from Razorpay's API and checks order, amount and status. No webhook is needed: a background check every 2 minutes catches customers who close the tab (docs/PAYMENTS.md).
- **Analytics** are first-party and cookie-free: a daily salted hash of IP + user agent, raw IPs never stored, bots ignored.
- **Writing rules** (brief section 4) are checked live in the product and notes editors.
- **Every admin change** is written to the audit log (Settings → Recent changes).
- **Roles**: Owner can do everything; Staff can't change settings, users, refunds or export customers.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest (pricing, coupons, bundles, sanitiser, money) |
| `npm run db:deploy` | Create/update tables; first time also adds the catalogue and owner login (never resets passwords) |
| `npm run db:seed` | Re-run the seed (resets the owner password to `.env`) |
| `npm run check` | Types, lint and tests in one go |
| `npm run db:studio` | Prisma Studio |

`/styleguide` shows the design system in development.
