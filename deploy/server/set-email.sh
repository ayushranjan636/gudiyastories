#!/usr/bin/env bash
# Turns on order emails on the live server, sends a test email, then sends every
# email that paid orders missed while email was off. Run ON THE SERVER:
#
#   bash /srv/gudiya/current/deploy/server/set-email.sh re_xxxxxxxx owner@example.com [test@example.com]
#
#   1st: Resend API key   2nd: where "New order" emails go   3rd (optional): where to send the test
set -euo pipefail
cd /
KEY="${1:?Usage: set-email.sh <RESEND_API_KEY> <owner-email> [test-email]}"
OWNER="${2:?Usage: set-email.sh <RESEND_API_KEY> <owner-email> [test-email]}"
TEST_TO="${3:-$OWNER}"
F=/srv/gudiya/shared/.env
FROM="Gudiya Stories <noreply@gudiyastories.com>"
[[ "$KEY" == re_* ]] || { echo "That doesn't look like a Resend key (they start with re_)."; exit 1; }

set_var() { sudo sed -i "s|^$1=.*|$1=\"$2\"|" "$F"; sudo grep -q "^$1=" "$F" || echo "$1=\"$2\"" | sudo tee -a "$F" >/dev/null; }

echo "Sending a test email from $FROM to $TEST_TO…"
RES=$(curl -sS https://api.resend.com/emails -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"from\":\"$FROM\",\"to\":[\"$TEST_TO\"],\"reply_to\":\"svbharathi@gudiyastories.com\",\"subject\":\"Gudiya Stories: order emails are on\",\"text\":\"This is a test from gudiyastories.com. Customers now get an email when their order is confirmed, packed, shipped and delivered, and new-order emails go to $OWNER.\"}")
if ! echo "$RES" | grep -q '"id"'; then
  echo "✗ Resend refused: $RES"
  echo "  Usually: gudiyastories.com isn't verified yet in Resend → Domains. Fix that, then run this again."
  exit 1
fi
echo "✔ Test email accepted by Resend. Check $TEST_TO (and the spam folder)."

set_var RESEND_API_KEY "$KEY"
set_var OWNER_NOTIFICATION_EMAIL "$OWNER"
set_var EMAIL_FROM "$FROM"
sudo systemctl restart gudiya
for _ in $(seq 1 30); do curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3000/api/health && break; sleep 1; done
echo "✔ Site restarted with order emails on."

SECRET="$(sudo grep -E '^CRON_SECRET=' "$F" | cut -d= -f2- | tr -d '"')"
echo "Sending emails that paid orders missed…"
curl -fsS -X POST -H "Authorization: Bearer $SECRET" "http://127.0.0.1:3000/api/cron/backfill-emails?days=30"
echo
