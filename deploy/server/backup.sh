#!/usr/bin/env bash
# Nightly backup at 03:00 IST (cron).
#   - Database: compressed dump, 14 days kept.
#   - Uploads: an incremental copy.
# AWS also snapshots the whole disk every night (7 kept), off the machine.
set -euo pipefail
cd /
DIR=/srv/gudiya/backups
KEEP_DAYS=14
STAMP=$(date +%F)
URL="$(grep -E '^DATABASE_URL=' /srv/gudiya/shared/.env | head -1 | cut -d= -f2- | tr -d '"')"

pg_dump --no-owner --format=custom --compress=9 --file="$DIR/db-$STAMP.dump.tmp" "$URL"
mv "$DIR/db-$STAMP.dump.tmp" "$DIR/db-$STAMP.dump"
mkdir -p "$DIR/uploads"
rsync -a /srv/gudiya/shared/uploads/ "$DIR/uploads/"

find "$DIR" -maxdepth 1 -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $(du -h "$DIR/db-$STAMP.dump" | cut -f1) database, $(du -sh "$DIR/uploads" | cut -f1) uploads"
