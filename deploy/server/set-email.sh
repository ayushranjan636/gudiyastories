#!/usr/bin/env bash
# Turns on order emails on the live server and sends a test email.
# Run ON THE SERVER:
#   bash /srv/gudiya/current/deploy/server/set-email.sh re_xxxxxxxx you@example.com
#   (1st: Resend API key, 2nd: where "New order" emails should go)
set -euo pipefail
cd /
KEY="${1:?Usage: set-email.sh <RESEND_API_KEY> <owner-email>}"
OWNER="${2:?Usage: set-email.sh <RESEND_API_KEY> <owner-email>}"
F=/srv/gudiya/shared/.env
[[ "$KEY" == re_* ]] || { echo "That doesn't look like a Resend key (they start with re_)."; exit 1; }

set_var() { sudo sed -i "s|^$1=.*|$1=\"$2\"|" "$F"; sudo grep -q "^$1=" "$F" || echo "$1=\"$2\"" | sudo tee -a "$F" >/dev/null; }
set_var RESEND_API_KEY "$KEY"
set_var OWNER_NOTIFICATION_EMAIL "$OWNER"
FROM=$(sudo grep -E '^EMAIL_FROM=' "$F" | cut -d= -f2- | tr -d '"')

echo "Sending a test email from $FROM to $OWNER…"
RES=$(curl -sS https://api.resend.com/emails -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d "{\"from\":\"$FROM\",\"to\":[\"$OWNER\"],\"subject\":\"Gudiya Stories: order emails are on\",\"text\":\"This is a test. New-order emails will arrive at this address, and customers will get their order confirmations.\"}")
if echo "$RES" | grep -q '"id"'; then
  echo "✔ Test email sent. Check $OWNER (and the spam folder)."
else
  echo "✗ Resend refused: $RES"
  echo "  Usually: the domain isn't verified yet in Resend → Domains. Fix that, then run this again."
  exit 1
fi
sudo systemctl restart gudiya
echo "✔ Site restarted with order emails on."
