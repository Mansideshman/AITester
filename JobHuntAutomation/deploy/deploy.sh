#!/usr/bin/env bash
# JobHunt Copilot VPS deploy script.
#
# Run as root (or via sudo) on a fresh Ubuntu 22.04+ server — DigitalOcean,
# Hetzner, Oracle Cloud, or any other provider; nothing here is DO-specific.
# Safe to re-run: re-running pulls the latest code, rebuilds, and restarts
# the service instead of re-cloning from scratch.
#
# Usage:
#   ./deploy.sh [git-repo-url] [domain]
#
#   git-repo-url  defaults to https://github.com/Mansideshman/AITester.git
#   domain        optional; if given, certbot requests a TLS cert for it.
#                 If omitted, nginx serves plain HTTP on the droplet's IP —
#                 fine to start with, add a domain + re-run later for TLS.
#
# Example:
#   ./deploy.sh https://github.com/Mansideshman/AITester.git jobhunt.example.com

set -euo pipefail

REPO_URL="${1:-https://github.com/Mansideshman/AITester.git}"
DOMAIN="${2:-}"

APP_USER=jobhuntcopilot
BASE_DIR=/opt/jobhuntcopilot
REPO_DIR="$BASE_DIR/repo"
APP_DIR="$BASE_DIR/app"          # symlink -> $REPO_DIR/JobHuntAutomation
DATA_DIR="$BASE_DIR/data"        # SQLite lives here — outside the repo checkout, so a
                                  # `git pull` + rebuild never touches real data.
UNIT_SRC="$REPO_DIR/JobHuntAutomation/deploy"

log() { echo -e "\n\033[1;32m==>\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root (e.g. sudo ./deploy.sh)." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
log "Installing system packages"
# ---------------------------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl build-essential nginx ufw ca-certificates gnupg

if ! command -v node >/dev/null || [[ "$(node -v | sed 's/^v//;s/\..*//')" -lt 20 ]]; then
  log "Installing Node.js 20 (system default is too old/absent)"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi

if [[ -n "$DOMAIN" ]]; then
  apt-get install -y -qq certbot python3-certbot-nginx
fi

# ---------------------------------------------------------------------------
log "Creating service user and directories"
# ---------------------------------------------------------------------------
id -u "$APP_USER" &>/dev/null || useradd --system --create-home --home-dir "$BASE_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$BASE_DIR" "$DATA_DIR"
chown -R "$APP_USER:$APP_USER" "$BASE_DIR"

# ---------------------------------------------------------------------------
log "Fetching JobHunt Copilot (sparse checkout — this repo is a multi-project monorepo)"
# ---------------------------------------------------------------------------
if [[ -d "$REPO_DIR/.git" ]]; then
  sudo -u "$APP_USER" git -C "$REPO_DIR" pull --ff-only
else
  sudo -u "$APP_USER" git clone --filter=blob:none --no-checkout "$REPO_URL" "$REPO_DIR"
  sudo -u "$APP_USER" git -C "$REPO_DIR" sparse-checkout init --cone
  sudo -u "$APP_USER" git -C "$REPO_DIR" sparse-checkout set JobHuntAutomation
  sudo -u "$APP_USER" git -C "$REPO_DIR" checkout master
fi
ln -sfn "$REPO_DIR/JobHuntAutomation" "$APP_DIR"

# ---------------------------------------------------------------------------
log "Configuring environment (backend/.env)"
# ---------------------------------------------------------------------------
if [[ ! -f "$APP_DIR/backend/.env" ]]; then
  sudo -u "$APP_USER" cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  sudo -u "$APP_USER" sed -i "s#^DATABASE_URL=.*#DATABASE_URL=\"file:$DATA_DIR/prod.db\"#" "$APP_DIR/backend/.env"
  echo "  Created $APP_DIR/backend/.env — it has NO API keys yet."
  echo "  Edit it now (or after this script finishes) and set JSEARCH_API_KEY"
  echo "  (and/or APIFY_TOKEN, ANTHROPIC_API_KEY), then: systemctl restart jobhuntcopilot"
else
  echo "  $APP_DIR/backend/.env already exists — leaving it as-is."
fi

# ---------------------------------------------------------------------------
log "Installing backend dependencies, running migrations + seed"
# ---------------------------------------------------------------------------
# Run from inside backend/ (not via --prefix) so tsx/Prisma CLI's automatic .env
# loading finds backend/.env, same as local dev.
(
  cd "$APP_DIR/backend"
  sudo -u "$APP_USER" npm install --silent
  sudo -u "$APP_USER" npx prisma migrate deploy
  sudo -u "$APP_USER" npm run build --silent
  # Idempotent — seed.ts only inserts Profile/SearchConfig if they don't already exist.
  sudo -u "$APP_USER" npx tsx prisma/seed.ts
)

# ---------------------------------------------------------------------------
log "Building frontend"
# ---------------------------------------------------------------------------
sudo -u "$APP_USER" npm --prefix "$APP_DIR/frontend" install --silent
sudo -u "$APP_USER" npm --prefix "$APP_DIR/frontend" run build --silent
# backend/src/index.ts auto-serves frontend/dist at "/" once it exists — no separate
# frontend deploy or web server needed for a fully self-hosted setup.

# ---------------------------------------------------------------------------
log "Installing systemd unit"
# ---------------------------------------------------------------------------
cp "$UNIT_SRC/jobhuntcopilot.service" /etc/systemd/system/jobhuntcopilot.service
systemctl daemon-reload
systemctl enable --now jobhuntcopilot.service
systemctl restart jobhuntcopilot.service

# ---------------------------------------------------------------------------
log "Configuring nginx"
# ---------------------------------------------------------------------------
SERVER_NAME="${DOMAIN:-_}"
sed "s/__DOMAIN__/$SERVER_NAME/" "$UNIT_SRC/nginx-jobhuntcopilot.conf" > /etc/nginx/sites-available/jobhuntcopilot
ln -sfn /etc/nginx/sites-available/jobhuntcopilot /etc/nginx/sites-enabled/jobhuntcopilot
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------------------------------------------------------------------------
log "Configuring firewall"
# ---------------------------------------------------------------------------
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

# ---------------------------------------------------------------------------
if [[ -n "$DOMAIN" ]]; then
  log "Requesting TLS certificate for $DOMAIN"
  echo "  certbot needs an email for renewal notices and to run interactively"
  echo "  the first time. Run manually:"
  echo "    certbot --nginx -d $DOMAIN"
else
  log "No domain given — skipping TLS. Add one and re-run to enable HTTPS:"
  echo "    ./deploy.sh $REPO_URL your-domain.example.com"
fi

# ---------------------------------------------------------------------------
log "Done"
# ---------------------------------------------------------------------------
PUBLIC_IP="$(curl -s -4 ifconfig.me || echo "<your-server-ip>")"
cat <<EOF

  JobHunt Copilot is running. Check status with:
    systemctl status jobhuntcopilot

  Visit:
    http://${DOMAIN:-$PUBLIC_IP}/

  Next steps:
    1. Set JSEARCH_API_KEY (recommended, free tier) in $APP_DIR/backend/.env
       if you haven't yet, then: systemctl restart jobhuntcopilot
    2. Open the app and go to Search & Fetch — click "Fetch All Sources" to
       pull real jobs.
EOF
