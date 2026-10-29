# Going live for free: Netlify + Supabase + Cloudflare R2

| Part | Service (free plan) | What it holds |
| --- | --- | --- |
| Website and admin | **Netlify** | The Next.js site, server functions, scheduled jobs |
| Database | **Supabase**, region **Mumbai (ap-south-1)** | Books, orders, customers, settings |
| Uploads | **Cloudflare R2** | Covers, blog pictures, PDFs and videos uploaded in Admin |
| Payments | **Razorpay** | Your live keys, pasted in Admin |
| Email (optional) | **Resend** | Receipts and order emails (3,000/month free) |

Free plans change. Check each one's current limits before launch. Netlify's free plan uses monthly credits, and each production deploy uses some, so deploy in batches rather than after every small edit.

## 1. Put the code on GitHub

The code lives in a GitHub repository. Netlify deploys from it automatically on every push to `main`.

## 2. Database: Supabase (about 5 minutes)

1. [supabase.com](https://supabase.com) → **New project**. Region: **South Asia (Mumbai)**. Choose a strong database password and save it.
2. Open the project → **Connect** (top bar) → **Connection string**, and copy two addresses:
   - **Transaction pooler** (port **6543**). This is `DATABASE_URL`, used by the site.
   - **Session pooler** (port **5432**). This is `DIRECT_URL`, used to create and update the tables on each deploy.
3. Put your password in place of `[YOUR-PASSWORD]`, then add `?uselibpqcompat=true&sslmode=require` to the end of both addresses:

```
DATABASE_URL=postgresql://postgres.abcd1234:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?uselibpqcompat=true&sslmode=require
DIRECT_URL=postgresql://postgres.abcd1234:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require
```

If the password contains `@ # / : ?`, write them as `%40 %23 %2F %3A %3F`.
Don't use the `db.<project>.supabase.co` address: it needs IPv6, which Netlify's build machines don't have.

You don't create any tables yourself. The first Netlify build creates them and adds the books.

## 3. Uploads: Cloudflare R2 (about 10 minutes)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage** → **Create bucket**, named for example `gudiya-uploads`. R2 asks for a card, but the free plan covers 10 GB and downloads are free.
2. Make the files public. In the bucket → **Settings** → **Public access**, either:
   - **Custom domain** (best), for example `media.gudiyastories.com`; or
   - **r2.dev subdomain**, for a quick start (`https://pub-xxxx.r2.dev`).
3. **CORS policy** (bucket → Settings → CORS). This lets the admin's browser upload straight to the bucket. Paste this, using your real site address:

```json
[
  {
    "AllowedOrigins": ["https://gudiyastories.com", "https://www.gudiyastories.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "cache-control"],
    "MaxAgeSeconds": 3600
  }
]
```

   Add your `https://<site>.netlify.app` address to `AllowedOrigins` too, so uploads work before the domain is connected.
4. R2 → **Manage API tokens** → **Create API token**: permission **Object Read & Write**, only this bucket. Copy the **Access Key ID**, the **Secret Access Key** and your **Account ID**.

## 4. Website: Netlify (about 10 minutes)

1. [app.netlify.com](https://app.netlify.com) → **Add new project** → **Import an existing project** → GitHub → pick the repository. Netlify reads `netlify.toml`, so leave the build settings as they are.
2. Before the first deploy, open **Site configuration → Environment variables** and add these values. Mark the secret ones as **secret**.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://gudiyastories.com` (or the `https://<site>.netlify.app` address for now) |
| `AUTH_URL` | same as above |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_SECRET` | run `openssl rand -base64 32` and paste the result |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `ANALYTICS_SALT_SECRET` | `openssl rand -hex 24` |
| `DATABASE_URL` | Supabase transaction pooler (port 6543), from step 2 |
| `DIRECT_URL` | Supabase session pooler (port 5432), from step 2 |
| `ADMIN_EMAIL` | the owner's email (first login) |
| `ADMIN_PASSWORD` | 12+ characters (first login; change it in Admin afterwards) |
| `ADMIN_NAME` | `S.V. Bharathi` |
| `SEED_DEMO_STOCK` | `false` |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET` | `gudiya-uploads` |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_PUBLIC_URL` | `https://media.gudiyastories.com` or your `https://pub-xxxx.r2.dev` |
| `AWS_ACCESS_KEY_ID` | R2 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL` | optional, for emails |

   `NEXT_PUBLIC_SITE_URL` and `S3_PUBLIC_URL` are built into the site, so after changing either one, trigger a new deploy (**Deploys → Trigger deploy**).
3. **Deploy**. The build log shows `Database created and filled. Owner login: …` the first time.
4. Open `https://<site>.netlify.app/api/health`. It should say `"database":"ok"`.
5. Sign in at `/admin` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then **change the password** in Settings → Your password.

## 5. Payments: Razorpay live keys

1. Finish Razorpay KYC. They review the Shipping, Returns, Privacy and Terms pages (`src/content/help.ts`), so approve those texts first.
2. In the Razorpay dashboard, switch to **Live mode** → Account & Settings → **API Keys** → generate a key.
3. Admin → **Settings → Online payments (Razorpay)**: paste the Key ID and Key Secret, then **Save and turn on payments**. The keys are checked with Razorpay and stored encrypted. Checkout takes real payments from that moment.
4. **Add the webhook** (recommended on Netlify): Razorpay → Account & Settings → Webhooks → Add:
   - URL: `https://gudiyastories.com/api/razorpay/webhook`
   - Secret: any long random text (`openssl rand -hex 32`). Paste the same text into the "Webhook secret" box in Admin → Settings.
   - Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
5. Place one small real order, then refund it from Admin → Orders → Refund.

Payments are confirmed four ways, and every way checks the payment with Razorpay itself:
- the customer's browser, straight after paying;
- their order page;
- the webhook;
- a scheduled check every 5 minutes (`netlify/functions/payments-sweep.mjs`), for customers who closed the tab.

## 6. Your domain

Netlify → **Domain management** → **Add a domain** → `gudiyastories.com`, then follow the DNS steps. HTTPS is set up for you. Afterwards:

- set `NEXT_PUBLIC_SITE_URL` and `AUTH_URL` to `https://gudiyastories.com` and redeploy;
- add the domain to the R2 CORS rule;
- set the Razorpay webhook to the new address.

## Scheduled jobs (already set up)

`netlify.toml` runs two Netlify Scheduled Functions:

| Function | When | What |
| --- | --- | --- |
| `payments-sweep` | every 5 minutes | settles payments that arrived without the browser reporting back; expires unpaid orders |
| `daily-job` | 08:00 IST | low-stock digest and enquiry follow-ups by email |

Both call the site with `CRON_SECRET`. The 5-minute check also keeps the free Supabase project from pausing for inactivity.

## Backups

Supabase's free plan has no downloadable backups. Once a week (or before big changes), run this from your computer:

```bash
pg_dump "$DIRECT_URL" --no-owner --format=custom -f gudiya-$(date +%F).dump
```

Uploaded files stay in R2.

## When something goes wrong

| Symptom | Fix |
| --- | --- |
| Build log: `SSL problem` / `certificate` | Both database addresses must end with `?uselibpqcompat=true&sslmode=require`. |
| Build log: `ENOTFOUND` / `ENETUNREACH` | Use the `…pooler.supabase.com` addresses, not `db.<project>.supabase.co`. |
| Build log: `Tenant or user not found` | The pooler user is `postgres.<project-ref>`, not just `postgres`. |
| Upload fails with "check the bucket's CORS rule" | Add the exact site address (https, no trailing slash) to the R2 CORS rule. |
| Uploaded images don't show | `S3_PUBLIC_URL` is wrong or public access is off; redeploy after fixing. |
| Admin shows "Online payment is off" | Paste live keys in Settings → Online payments. Test keys are refused on the live site. |
