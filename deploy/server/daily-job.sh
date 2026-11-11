#!/usr/bin/env bash
# Daily at 08:00 IST (cron): settles open payments, expires unpaid checkouts,
# emails the low-stock digest and enquiry follow-ups.
set -euo pipefail
cd /
SECRET="$(grep -E '^CRON_SECRET=' /srv/gudiya/shared/.env | head -1 | cut -d= -f2- | tr -d '"')"
[ -n "$SECRET" ] || { echo "$(date -Is) CRON_SECRET missing"; exit 1; }
echo "$(date -Is) $(curl -fsS --max-time 120 -H "Authorization: Bearer $SECRET" http://127.0.0.1:3000/api/cron/daily)"
