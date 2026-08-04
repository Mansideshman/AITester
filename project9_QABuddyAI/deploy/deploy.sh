#!/usr/bin/env bash
# QABuddyAI VPS deploy script.
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
#   ./deploy.sh https://github.com/Mansideshman/AITester.git qabuddy.example.com

set -euo pipefail

REPO_URL="${1:-https://github.com/Mansideshman/AITester.git}"
DOMAIN="${2:-}"

APP_USER=qabuddyai
BASE_DIR=/opt/qabuddyai
REPO_DIR="$BASE_DIR/repo"
APP_DIR="$BASE_DIR/app"          # symlink -> $REPO_DIR/project9_QABuddyAI
UNIT_SRC="$REPO_DIR/project9_QABuddyAI/deploy"

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
apt-get install -y -qq \
  python3 python3-venv python3-pip \
  git curl build-essential \
  nginx ufw \
  ca-certificates gnupg

if ! command -v node >/dev/null || [[ "$(node -v | sed 's/^v//;s/\..*//')" -lt 20 ]]; then
  log "Installing Node.js 20 (frontend build needs it — system default is too old)"
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
mkdir -p "$BASE_DIR"
chown "$APP_USER:$APP_USER" "$BASE_DIR"

# ---------------------------------------------------------------------------
log "Fetching QABuddyAI (sparse checkout — this repo is a multi-project monorepo)"
# ---------------------------------------------------------------------------
if [[ -d "$REPO_DIR/.git" ]]; then
  sudo -u "$APP_USER" git -C "$REPO_DIR" pull --ff-only
else
  sudo -u "$APP_USER" git clone --filter=blob:none --no-checkout "$REPO_URL" "$REPO_DIR"
  sudo -u "$APP_USER" git -C "$REPO_DIR" sparse-checkout init --cone
  sudo -u "$APP_USER" git -C "$REPO_DIR" sparse-checkout set project9_QABuddyAI
  sudo -u "$APP_USER" git -C "$REPO_DIR" checkout master
fi
ln -sfn "$REPO_DIR/project9_QABuddyAI" "$APP_DIR"

# ---------------------------------------------------------------------------
log "Setting up Python environment"
# ---------------------------------------------------------------------------
if [[ ! -d "$APP_DIR/.venv" ]]; then
  sudo -u "$APP_USER" python3 -m venv "$APP_DIR/.venv"
fi
sudo -u "$APP_USER" "$APP_DIR/.venv/bin/pip" install --quiet --upgrade pip
sudo -u "$APP_USER" "$APP_DIR/.venv/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"

# ---------------------------------------------------------------------------
log "Building frontend"
# ---------------------------------------------------------------------------
sudo -u "$APP_USER" npm --prefix "$APP_DIR/frontend" install --silent
sudo -u "$APP_USER" npm --prefix "$APP_DIR/frontend" run build --silent
# qabuddy/api/app.py auto-serves frontend/dist at "/" once it exists — no
# separate web server or Vercel deploy needed for a fully self-hosted setup.

# ---------------------------------------------------------------------------
log "Configuring environment (.env)"
# ---------------------------------------------------------------------------
if [[ ! -f "$APP_DIR/.env" ]]; then
  sudo -u "$APP_USER" cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "  Created $APP_DIR/.env from .env.example — it has NO API key yet."
  echo "  Edit it now (or after this script finishes) and set GROQ_API_KEY"
  echo "  (or OPENROUTER_API_KEY), then: systemctl restart qabuddyai"
else
  echo "  $APP_DIR/.env already exists — leaving it as-is."
fi

# ---------------------------------------------------------------------------
log "Installing systemd units"
# ---------------------------------------------------------------------------
cp "$UNIT_SRC/qabuddyai.service" /etc/systemd/system/qabuddyai.service
cp "$UNIT_SRC/qabuddyai-ingest.service" /etc/systemd/system/qabuddyai-ingest.service
cp "$UNIT_SRC/qabuddyai-ingest.timer" /etc/systemd/system/qabuddyai-ingest.timer
systemctl daemon-reload
systemctl enable --now qabuddyai.service
systemctl restart qabuddyai.service
# The hourly ingest timer is a phase-2 feature (see ARCHITECTURE.md) — the
# unit is installed so it's a one-command opt-in, but NOT enabled by
# default: `systemctl enable --now qabuddyai-ingest.timer`.

# ---------------------------------------------------------------------------
log "Configuring nginx"
# ---------------------------------------------------------------------------
SERVER_NAME="${DOMAIN:-_}"
sed "s/__DOMAIN__/$SERVER_NAME/" "$UNIT_SRC/nginx-qabuddyai.conf" > /etc/nginx/sites-available/qabuddyai
ln -sfn /etc/nginx/sites-available/qabuddyai /etc/nginx/sites-enabled/qabuddyai
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

  QABuddyAI is running. Check status with:
    systemctl status qabuddyai

  Visit:
    http://${DOMAIN:-$PUBLIC_IP}/api/health

  Next steps:
    1. Set GROQ_API_KEY in $APP_DIR/.env if you haven't yet, then:
         systemctl restart qabuddyai
    2. Copy real data into $APP_DIR/data/<source>/ (scp/rsync from your
       machine — data/ is gitignored, nothing was cloned into it).
    3. Trigger ingestion: curl -X POST http://127.0.0.1:8000/api/ingest
       (or use the dashboard's Sources page once you can reach it).
EOF
