# The live site: AWS EC2 + GitHub Actions

| | |
| --- | --- |
| Server | AWS EC2 **t4g.small** (2 vCPU ARM, 2 GB), Ubuntu 24.04, **Mumbai**: `gudiya-stories` |
| Database | PostgreSQL on the same server (localhost only) |
| Uploads | the server's disk, `/srv/gudiya/shared/uploads` |
| In front | **Cloudflare** (DNS, HTTPS, attack protection) |
| Deploys | **GitHub Actions**: every push to `main` goes live by itself |

## Monthly bill (AWS on-demand, Mumbai)

| Item | Price |
| --- | --- |
| EC2 t4g.small, always on | $8.18 |
| 20 GB encrypted gp3 disk | $1.82 |
| Public IPv4 address | $3.65 |
| Nightly disk snapshots (7 kept, incremental) | about $0.50 |
| Data transfer: first 100 GB/month free (Cloudflare caches most of it) | $0 |
| GST 18% | about $2.55 |
| **Total** | **about $16.70 ≈ ₹1,450 a month** |

GitHub Actions is free for this repository, and Cloudflare is free.

## How a change goes live

1. Edit the code and push (or merge) to **`main`**.
2. GitHub Actions (repo → **Actions** tab):
   1. checks types, lint and tests;
   2. builds the site;
   3. uploads only what changed;
   4. updates the database;
   5. switches over.

   This takes about 3–4 minutes.
3. If anything fails, nothing changes: the previous version stays live, and the failed run shows why.

To redeploy without a code change: Actions → **Deploy** → **Run workflow**.

## Security

| | |
| --- | --- |
| Web traffic | The AWS firewall lets ports 80/443 in **only from Cloudflare**. The server's IP can't be used to bypass Cloudflare. |
| HTTPS | Cloudflare → server is encrypted (SSL mode **Full**, or **Full (strict)** with the Origin Certificate below) |
| SSH | Key only: no passwords, no root, 3 tries; fail2ban blocks repeat offenders |
| Database | Listens on the server only; random 48-character password |
| Disk | Encrypted (EBS encryption) |
| Server | Automatic security updates; IMDSv2 required; termination protection on |
| The site | Runs as its own user with no login, in a locked systemd sandbox |
| Secrets | `/srv/gudiya/shared/.env` (server only) and GitHub encrypted secrets. Never in git. |
| The app | Online payment only, every payment checked with Razorpay, rate limits, Content-Security-Policy, 33 attack tests |

## Where the settings live

| What | Where |
| --- | --- |
| Live settings (database, secrets, email key, owner login) | on the server: `/srv/gudiya/shared/.env` |
| Razorpay live keys | **Admin → Settings → Online payments** (stored encrypted in the database) |
| Deploy access (server IP, deploy key) | GitHub → repo → Settings → Environments → **production** |
| Your SSH key to the server | your Mac: `~/.ssh/gudiya-ec2.pem`. **Back it up**; it's the only way in. |
| Local testing only | `.env` in the project folder on your Mac |

To change a live setting:

```bash
ssh -i ~/.ssh/gudiya-ec2.pem ubuntu@<server-ip>
sudo nano /srv/gudiya/shared/.env        # edit, Ctrl+O, Enter, Ctrl+X
sudo systemctl restart gudiya
```

## Cloudflare (DNS for gudiyastories.com)

**DNS → Records.** For the website, keep only these two records. Delete every other A, AAAA or CNAME for `@` and `www`, including the old GoDaddy and AWS ones.

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `@` | the server IP | **Proxied** (orange) |
| A | `www` | the server IP | **Proxied** (orange) |

Leave the **MX** (Zoho) and **TXT** records as they are; they're your email.

**SSL/TLS → Overview:** set **Full**. **Rules:** delete any old redirect rules from the GoDaddy site.

**For SSL mode Full (strict), recommended:** Cloudflare → SSL/TLS → Origin Server → **Create Certificate** (keep the defaults). Save the two parts as `origin.pem` and `origin.key`, then:

```bash
scp -i ~/.ssh/gudiya-ec2.pem origin.pem origin.key ubuntu@<server-ip>:
ssh -i ~/.ssh/gudiya-ec2.pem ubuntu@<server-ip> 'sudo install -m 600 origin.key /etc/ssl/gudiya/origin.key && sudo install -m 644 origin.pem /etc/ssl/gudiya/origin.pem && rm origin.* && sudo nginx -t && sudo systemctl reload nginx'
```

Then switch Cloudflare to **Full (strict)**.

## Order emails (Resend)

After every **paid** order, two emails go out:

| Email | To | From | Replies go to |
| --- | --- | --- | --- |
| Order confirmation + receipt link | the customer | `Gudiya Stories <noreply@gudiyastories.com>` | `svbharathi@gudiyastories.com` (Zoho inbox) |
| "New order GS-…" with items, phone, address, admin link | you (`OWNER_NOTIFICATION_EMAIL`) | same | same |

**Setup (about 10 minutes):**

1. Sign up at [resend.com](https://resend.com) (free: 3,000 emails/month, 100/day).
2. **Domains → Add domain** → `gudiyastories.com` (any region).
3. Resend shows **3 DNS records**. Add each one in **Cloudflare → DNS → Records**, exactly as shown and set to **DNS only (grey cloud)**:
   - **TXT** `resend._domainkey` → a long `p=…` value (DKIM);
   - **MX** `send` → `feedback-smtp….amazonses.com`, priority 10;
   - **TXT** `send` → `v=spf1 include:amazonses.com ~all`.

   They are on `send.` and `resend._domainkey`, so **Zoho email is not affected**. Don't change the existing MX or TXT on `@`.
4. Back in Resend → **Verify**. It usually turns green within a few minutes.
5. **API Keys → Create API key**: permission *Sending access*, domain `gudiyastories.com`. Copy the key (`re_…`); it's shown once.
6. Turn it on on the server, which also sends you a test email:
   ```bash
   ssh -i ~/.ssh/gudiya-ec2.pem ubuntu@<server-ip> \
     "bash /srv/gudiya/current/deploy/server/set-email.sh re_YOUR_KEY svbharathi@gudiyastories.com"
   ```

The yellow "Order emails are off" bar in Admin disappears once this is done.

**Optional:** add a DMARC record in Cloudflare so the mail is trusted more: **TXT** `_dmarc` → `v=DMARC1; p=none; rua=mailto:svbharathi@gudiyastories.com`.

## Razorpay (live payments)

1. Razorpay → **Live mode** → API Keys → Generate. Paste the Key ID + Secret in **Admin → Settings → Online payments**.
2. Razorpay → Webhooks → Add `https://gudiyastories.com/api/razorpay/webhook`. Events: `payment.captured`, `payment.failed`, `order.paid` and `refund.processed`. Use a long random secret, and paste the same secret in Admin.

## What runs by itself

| When | What |
| --- | --- |
| Every 2 minutes | Payment check with Razorpay; retries failed order emails |
| 03:00 IST | Database backup + copy of uploads on the server (14 days kept) |
| 03:30 IST | AWS snapshot of the whole disk (7 kept) |
| 08:00 IST | Expire unpaid checkouts; low-stock and follow-up email |
| When needed | Ubuntu security updates (restart at 04:00 IST if required) |

## Useful commands

```bash
S="ssh -i ~/.ssh/gudiya-ec2.pem ubuntu@<server-ip>"
$S 'curl -s localhost:3000/api/health'                      # is it up?
$S 'sudo journalctl -u gudiya -n 100 --no-pager'           # the site's log
$S 'bash /srv/gudiya/current/deploy/server/rollback.sh'    # back to the previous version
scp -i ~/.ssh/gudiya-ec2.pem "ubuntu@<server-ip>:/srv/gudiya/backups/db-*.dump" .   # copy backups to your Mac
```

## Restoring

- **Whole server:** EC2 → Snapshots → pick one → Create volume, then swap it in (or ask for help).
- **Database only** (to a night's backup):
  ```bash
  sudo systemctl stop gudiya
  sudo -u postgres dropdb gudiya && sudo -u postgres createdb -O gudiya gudiya
  sudo -u gudiya cat /srv/gudiya/backups/db-YYYY-MM-DD.dump | sudo -u postgres pg_restore --no-owner --role=gudiya -d gudiya
  sudo systemctl start gudiya
  ```
