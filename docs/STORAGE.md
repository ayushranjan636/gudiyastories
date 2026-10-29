# File uploads

Book covers, blog images and PDFs that you upload in Admin are stored by one small module, `src/server/storage.ts`. It has two drivers, and you pick one in `.env`.

## Local (default)

```
STORAGE_DRIVER="local"
```

- **Where files go:** `storage/uploads/` in the project folder, or `UPLOAD_DIR` if you set it. They're served at `/uploads/...`.
- **Nothing to set up.** The folder is in `.gitignore`.
- **Checks:** every upload is checked by its actual bytes (JPG, PNG, WebP, AVIF or PDF, images and PDFs up to 15 MB, videos up to 200 MB) and gets a random name, so files never overwrite each other.

This is for your own computer (or a normal server with a lasting disk; point `UPLOAD_DIR` at it). It doesn't work on Netlify: use R2 there.

## Cloudflare R2 (the live site on Netlify)

Netlify has no lasting disk, so the live site stores uploads in Cloudflare R2 (S3-compatible, 10 GB free, free downloads):

```
STORAGE_DRIVER="s3"
S3_BUCKET="gudiya-uploads"
S3_REGION="auto"
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
S3_PUBLIC_URL="https://media.gudiyastories.com"   # or the bucket's https://pub-xxxx.r2.dev address
AWS_ACCESS_KEY_ID="<R2 access key id>"
AWS_SECRET_ACCESS_KEY="<R2 secret access key>"
```

Setup (public access, CORS rule, API token) is in [DEPLOY-NETLIFY.md](DEPLOY-NETLIFY.md#3-uploads-cloudflare-r2-about-10-minutes).

**How an upload works with R2:**

1. The admin's browser asks the site for permission (`/api/admin/upload/start`). The site checks the declared type and size and returns a signed address that is valid for 15 minutes.
2. The browser sends the file **straight to R2**. Large videos never pass through Netlify, whose requests are limited to a few MB.
3. The browser tells the site it's done (`/api/admin/upload/finish`). The site reads the real size and first bytes of the stored file. If the file isn't what was declared, or isn't an allowed type, it is **deleted**.

The bucket's CORS rule must allow `PUT` from the site's address, otherwise step 2 fails with a message that points here.

## Amazon S3

The same driver works with Amazon S3: leave `S3_ENDPOINT` empty and set `S3_REGION` to the bucket's region (for example `ap-south-1`). Give the bucket the same CORS rule.
