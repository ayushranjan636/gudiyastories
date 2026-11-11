#!/usr/bin/env bash
# Turns on order emails (Amazon SES) on the live server, sends a test email, then
# sends every email that paid orders missed while email was off. Run ON THE SERVER:
#
#   bash /srv/gudiya/current/deploy/server/set-email.sh <owner-email> [test-email]
#
# The server sends through its IAM role (send-only, from @gudiyastories.com), so no
# keys are stored. gudiyastories.com must be verified in SES (docs/DEPLOY-EC2.md).
set -euo pipefail
cd /
OWNER="${1:?Usage: set-email.sh <owner-email> [test-email]}"
TEST_TO="${2:-$OWNER}"
F=/srv/gudiya/shared/.env
FROM="Gudiya Stories <noreply@gudiyastories.com>"

set_var() { sudo sed -i "s|^$1=.*|$1=\"$2\"|" "$F"; sudo grep -q "^$1=" "$F" || echo "$1=\"$2\"" | sudo tee -a "$F" >/dev/null; }
set_var EMAIL_PROVIDER "ses"
set_var SES_REGION "ap-south-1"
set_var EMAIL_FROM "$FROM"
set_var OWNER_NOTIFICATION_EMAIL "$OWNER"
set_var RESEND_API_KEY ""
sudo systemctl restart gudiya
for _ in $(seq 1 30); do curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3000/api/health && break; sleep 1; done
echo "✔ Order emails on (Amazon SES, from $FROM)."

SECRET="$(sudo grep -E '^CRON_SECRET=' "$F" | cut -d= -f2- | tr -d '"')"
echo "Sending a test email to $TEST_TO…"
curl -fsS -X POST -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -d "{\"to\":\"$TEST_TO\"}" http://127.0.0.1:3000/api/cron/test-email
echo
