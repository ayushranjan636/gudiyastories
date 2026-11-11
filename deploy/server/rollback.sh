#!/usr/bin/env bash
# Rolls the live site back to the previous release. Run on the server:
#   ssh -i ~/.ssh/gudiya-ec2.pem ubuntu@<ip> 'bash /srv/gudiya/current/deploy/server/rollback.sh'
set -euo pipefail
cd /
cur=$(readlink -f /srv/gudiya/current)
prev=$(ls -1dt /srv/gudiya/releases/*/ | sed 's#/$##' | grep -vx "$cur" | head -1)
[ -n "$prev" ] || { echo "No earlier release to go back to."; exit 1; }
sudo -u gudiya ln -sfn "$prev" /srv/gudiya/current
sudo systemctl restart gudiya
sleep 5
echo "Rolled back to $(basename "$prev"): $(curl -fsS http://127.0.0.1:3000/api/health)"
