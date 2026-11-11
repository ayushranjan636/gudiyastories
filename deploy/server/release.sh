#!/usr/bin/env bash
# Switches the server to a new release. Runs ON THE SERVER as "ubuntu"; started by
# the GitHub Actions deploy (.github/workflows/deploy.yml), which has already
# built the site.
#
# Packages are installed once per package-lock.json and shared between releases,
# so a normal deploy installs nothing. The live site keeps running until the new
# release is ready; if it doesn't answer its health check, the previous one is
# put back automatically.
set -euo pipefail
cd /

ID="${1:?release id}"
BASE=/srv/gudiya
REL="$BASE/releases/$ID"
KEEP=3
APP=gudiya

say()  { printf '\033[32m›\033[0m %s\n' "$*"; }
fail() { printf '\033[31m✗\033[0m %s\n' "$*"; exit 1; }
as_app() { sudo -u "$APP" -H bash -c "cd '$REL' && $*"; }

sudo test -f "$BASE/shared/.env" || fail "$BASE/shared/.env is missing. Run setup-server.sh first."
[ -d "$BASE/incoming/$ID/.next-deploy" ] || fail "No build found in this upload."

sudo mv "$BASE/incoming/$ID" "$REL"
sudo chown -R "$APP:$APP" "$REL"
as_app "ln -sfn $BASE/shared/.env .env"

# Keep the service and helper scripts in step with the code.
if ! sudo cmp -s "$REL/deploy/server/gudiya.service" /etc/systemd/system/gudiya.service; then
  sudo install -m 644 "$REL/deploy/server/gudiya.service" /etc/systemd/system/gudiya.service
  sudo systemctl daemon-reload
fi
sudo install -m 755 "$REL/deploy/server/backup.sh" /usr/local/bin/gudiya-backup
sudo install -m 755 "$REL/deploy/server/daily-job.sh" /usr/local/bin/gudiya-daily-job

# Packages: one shared copy per package-lock.json + .npmrc, installed on this
# machine so native parts match its processor (ARM).
HASH=$(cat "$REL/package-lock.json" "$REL/.npmrc" 2>/dev/null | sha256sum | cut -c1-16)
DEPS="$BASE/shared/deps/$HASH"
if ! sudo test -f "$DEPS/.ok"; then
  say "Installing packages (only when they change)…"
  sudo rm -rf "$DEPS"
  sudo -u "$APP" mkdir -p "$DEPS"
  sudo -u "$APP" cp -r "$REL/package.json" "$REL/package-lock.json" "$REL/.npmrc" "$REL/prisma" "$REL/prisma.config.ts" "$DEPS/"
  sudo -u "$APP" -H bash -c "cd '$DEPS' && npm ci --no-audit --no-fund" || { sudo rm -rf "$DEPS"; fail "npm ci failed."; }
  sudo -u "$APP" touch "$DEPS/.ok"
fi
as_app "rm -rf node_modules && ln -sfn '$DEPS/node_modules' node_modules"

say "Checking settings…"
as_app "NODE_ENV=production node deploy/server/check-env.mjs"

say "Updating the database…"
as_app "NODE_ENV=production npm run --silent db:deploy"

PREV="$(readlink -f "$BASE/current" 2>/dev/null || true)"
sudo -u "$APP" ln -sfn "$REL" "$BASE/current"
say "Restarting the site…"
sudo systemctl restart gudiya

healthy=""
for _ in $(seq 1 45); do
  if curl -fsS --max-time 5 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then healthy=1; break; fi
  sleep 1
done
# Healthy means no startup errors either (a missing package shows up here).
if [ -n "$healthy" ] && sudo journalctl -u gudiya --since "-60s" --no-pager | grep -qE "Cannot find (module|package)|ERR_MODULE_NOT_FOUND"; then
  healthy=""
fi
if [ -z "$healthy" ]; then
  sudo journalctl -u gudiya -n 40 --no-pager || true
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    sudo -u "$APP" ln -sfn "$PREV" "$BASE/current"
    sudo systemctl restart gudiya
    fail "The new version didn't start (log above). The previous version is back online."
  fi
  fail "The site didn't start (log above)."
fi
say "Live: $(curl -fsS http://127.0.0.1:3000/api/health)"

# Pages pre-built without a database get rebuilt from the live one on their next visit.
SECRET="$(sudo grep -E '^CRON_SECRET=' "$BASE/shared/.env" | head -1 | cut -d= -f2- | tr -d '"')"
curl -fsS -X POST -H "Authorization: Bearer $SECRET" http://127.0.0.1:3000/api/cron/revalidate >/dev/null && say "Pages refreshed from the live database." || printf '\033[33m!\033[0m %s\n' "Couldn't refresh pages (they refresh on their own within the hour)."
# Warm every page twice (first visit triggers the rebuild, second confirms it), so
# real visitors never see a page built without the database.
PAGES=$(curl -fsS --max-time 20 http://127.0.0.1:3000/sitemap.xml | grep -o '<loc>[^<]*' | sed -E 's#<loc>https?://[^/]+##' || true)
for round in 1 2; do
  for p in / $PAGES; do curl -fsS -o /dev/null --max-time 20 "http://127.0.0.1:3000$p" || true; done
  [ "$round" = 1 ] && sleep 3
done
say "Warmed $(echo "$PAGES" | wc -w | tr -d ' ') pages."

# Keep the last few releases for quick rollbacks, and only the packages they use.
ls -1dt "$BASE"/releases/*/ | tail -n +$((KEEP + 1)) | while read -r old; do
  [ "$(readlink -f "$BASE/current")/" = "$old" ] || sudo rm -rf "$old"
done
used=$(for r in "$BASE"/releases/*/; do readlink -f "$r/node_modules" 2>/dev/null | xargs -r dirname; done | sort -u)
for d in "$BASE"/shared/deps/*/; do
  [ -d "$d" ] || continue
  d=${d%/}; grep -qx "$d" <<<"$used" || sudo rm -rf "$d"
done
