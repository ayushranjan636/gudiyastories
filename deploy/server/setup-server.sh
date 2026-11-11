#!/usr/bin/env bash
# One-time setup of the Gudiya Stories server: AWS EC2 t4g.small (ARM), Ubuntu
# 24.04, Mumbai. Website, admin and PostgreSQL all run on this one machine,
# behind Cloudflare. Run ON THE SERVER as "ubuntu":
#
#   bash setup-server.sh gudiyastories.com
#
# Safe to run again. Full guide: docs/DEPLOY-EC2.md
set -euo pipefail

DOMAIN="${1:?Usage: bash setup-server.sh <domain>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP=gudiya                     # system user the site runs as (no login, no sudo)
BASE=/srv/gudiya
DB=gudiya

say()  { printf '\n\033[32m›\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }

[ "$(id -u)" -ne 0 ] || { warn "Run this as the ubuntu user, not root."; exit 1; }
cd /

say "Updating Ubuntu…"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get -o Dpkg::Options::=--force-confold upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  nginx postgresql postgresql-contrib ufw fail2ban unattended-upgrades rsync curl ca-certificates gnupg

say "Automatic security updates (restart at 04:00 IST if needed)…"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "22:30";' | sudo tee /etc/apt/apt.conf.d/52gudiya-reboot >/dev/null

if ! command -v node >/dev/null || ! node -v | grep -q '^v22\.'; then
  say "Installing Node.js 22 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2 GB of memory is enough to run; a little swap is a safety net for installs.
if ! sudo swapon --show | grep -q /swapfile; then
  say "Adding 1 GB swap…"
  [ -f /swapfile ] || { sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null; }
  if sudo swapon /swapfile 2>/dev/null; then
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  else
    warn "Couldn't turn on swap."
  fi
  printf 'vm.swappiness=10\n' | sudo tee /etc/sysctl.d/99-gudiya.conf >/dev/null
  sudo sysctl -p /etc/sysctl.d/99-gudiya.conf >/dev/null 2>&1 || true
fi

say "Locking down SSH (keys only, no root, no passwords)…"
sudo tee /etc/ssh/sshd_config.d/99-gudiya.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 3
LoginGraceTime 20
X11Forwarding no
EOF
sudo systemctl reload ssh || true

say "Firewall on the server too: only SSH, HTTP and HTTPS…"
sudo ufw default deny incoming >/dev/null
sudo ufw default allow outgoing >/dev/null
sudo ufw allow OpenSSH >/dev/null
sudo ufw allow 'Nginx Full' >/dev/null
sudo ufw --force enable >/dev/null

say "Blocking repeated failed logins (fail2ban)…"
sudo tee /etc/fail2ban/jail.d/gudiya.conf >/dev/null <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
[sshd]
enabled = true
EOF
sudo systemctl enable fail2ban >/dev/null 2>&1
sudo systemctl restart fail2ban || warn "fail2ban didn't start; check: sudo journalctl -u fail2ban"

say "App user and folders…"
id "$APP" >/dev/null 2>&1 || sudo useradd --system --create-home --home-dir /var/lib/$APP --shell /usr/sbin/nologin "$APP"
sudo mkdir -p "$BASE"/{releases,shared/uploads,shared/deps,backups,incoming}
sudo chown -R "$APP:$APP" "$BASE"
sudo chown ubuntu:ubuntu "$BASE/incoming"
sudo chmod 750 "$BASE" "$BASE/shared" "$BASE/backups"
sudo usermod -aG "$APP" ubuntu

say "PostgreSQL (local only, never reachable from the internet)…"
sudo systemctl enable --now postgresql >/dev/null
PGCONF=$(ls -d /etc/postgresql/*/main | sort -V | tail -1)
sudo tee "$PGCONF/conf.d/gudiya.conf" >/dev/null <<'EOF'
listen_addresses = 'localhost'
max_connections = 50
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB
maintenance_work_mem = 64MB
password_encryption = scram-sha-256
EOF
sudo systemctl restart postgresql
if ! sudo test -f "$BASE/shared/.db-password"; then
  DBPASS=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB') THEN CREATE ROLE $DB LOGIN PASSWORD '$DBPASS';
  ELSE ALTER ROLE $DB WITH PASSWORD '$DBPASS'; END IF;
END \$\$;
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1 || sudo -u postgres createdb -O "$DB" "$DB"
  echo "$DBPASS" | sudo tee "$BASE/shared/.db-password" >/dev/null
  sudo chown "$APP:$APP" "$BASE/shared/.db-password" && sudo chmod 600 "$BASE/shared/.db-password"
fi
DBPASS=$(sudo cat "$BASE/shared/.db-password")

if ! sudo test -f "$BASE/shared/.env"; then
  say "Writing $BASE/shared/.env with fresh secrets…"
  sed \
    -e "s|__DOMAIN__|$DOMAIN|g" \
    -e "s|__DBPASS__|$DBPASS|g" \
    -e "s|__AUTH_SECRET__|$(openssl rand -base64 32)|" \
    -e "s|__CRON_SECRET__|$(openssl rand -hex 24)|" \
    -e "s|__ANALYTICS_SALT_SECRET__|$(openssl rand -hex 24)|" \
    "$HERE/env.production.example" | sudo tee "$BASE/shared/.env" >/dev/null
  sudo chown "$APP:$APP" "$BASE/shared/.env" && sudo chmod 640 "$BASE/shared/.env"
fi

say "Website service…"
sudo install -m 644 "$HERE/gudiya.service" /etc/systemd/system/gudiya.service
sudo systemctl daemon-reload
sudo systemctl enable gudiya >/dev/null

say "Daily job (08:00 IST) and nightly backup (03:00 IST)…"
sudo install -m 755 "$HERE/daily-job.sh" /usr/local/bin/gudiya-daily-job
sudo install -m 755 "$HERE/backup.sh" /usr/local/bin/gudiya-backup
sudo tee /etc/cron.d/gudiya >/dev/null <<EOF
SHELL=/bin/bash
30 2 * * * $APP /usr/local/bin/gudiya-daily-job >> /var/log/gudiya/daily.log 2>&1
30 21 * * * $APP /usr/local/bin/gudiya-backup >> /var/log/gudiya/backup.log 2>&1
EOF
sudo mkdir -p /var/log/gudiya && sudo chown "$APP:$APP" /var/log/gudiya
sudo tee /etc/logrotate.d/gudiya >/dev/null <<'EOF'
/var/log/gudiya/*.log { weekly rotate 8 compress missingok notifempty }
EOF
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=300M\n' | sudo tee /etc/systemd/journald.conf.d/gudiya.conf >/dev/null
sudo systemctl restart systemd-journald

say "nginx for ${DOMAIN} (behind Cloudflare)…"
sudo install -m 644 "$HERE/cloudflare-realip.conf" /etc/nginx/conf.d/cloudflare-realip.conf
# HTTPS between Cloudflare and this server: a self-signed certificate until the
# Cloudflare Origin Certificate is installed (docs/DEPLOY-EC2.md). Never overwrites a real one.
sudo mkdir -p /etc/ssl/gudiya && sudo chmod 700 /etc/ssl/gudiya
if ! sudo test -f /etc/ssl/gudiya/origin.pem; then
  sudo openssl req -x509 -nodes -newkey rsa:2048 -days 825 -subj "/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN" \
    -keyout /etc/ssl/gudiya/origin.key -out /etc/ssl/gudiya/origin.pem 2>/dev/null
  sudo chmod 600 /etc/ssl/gudiya/origin.key
fi
sed -e "s|__DOMAIN__|$DOMAIN|g" "$HERE/nginx.conf" | sudo tee /etc/nginx/sites-available/gudiya >/dev/null
sudo ln -sfn /etc/nginx/sites-available/gudiya /etc/nginx/sites-enabled/gudiya
sudo rm -f /etc/nginx/sites-enabled/default
sudo usermod -aG "$APP" www-data   # nginx serves uploaded files directly
sudo nginx -t && sudo systemctl enable --now nginx >/dev/null && sudo systemctl reload nginx

cat <<EOF

  ✔ Server ready. Deploys come from GitHub Actions (push to main).
EOF
