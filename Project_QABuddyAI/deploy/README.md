# Deploying QABuddyAI to a VPS

Everything here is provider-agnostic — DigitalOcean, Hetzner, Oracle Cloud,
AWS Lightsail, a work server, whatever you can SSH into as root. Nothing in
`deploy.sh` is DigitalOcean-specific.

## Prerequisites

- A fresh **Ubuntu 22.04 or 24.04** server, reachable over SSH as root (or a
  user with passwordless `sudo`).
- **Sizing**: bge-m3 (~2.3GB) and bge-reranker-v2-m3 (~1.1GB) are both loaded
  into memory at once and inference is CPU-bound and multi-threaded.
  Recommended minimum: **4GB RAM / 2 vCPUs**. **8GB RAM / 4 vCPUs** gives
  comfortable headroom, especially while ingesting a large corpus (embedding
  thousands of chunks is the slowest, most memory-hungry step — see the
  troubleshooting note below on what happens under memory pressure).
- 20GB+ disk (models cache to `~/.cache/huggingface`, ~3.5GB combined; the
  embedded Qdrant store grows with however much you ingest).
- A `GROQ_API_KEY` (or `OPENROUTER_API_KEY`) — generation and query rewriting
  need one; get a free Groq key at [console.groq.com](https://console.groq.com).
- Optional: a domain name pointed at the server's IP, if you want TLS.

## Quick start

SSH into the server as root, then:

```bash
curl -O https://raw.githubusercontent.com/Mansideshman/AITester/master/project9_QABuddyAI/deploy/deploy.sh
chmod +x deploy.sh
./deploy.sh                                    # HTTP only, no domain
# or:
./deploy.sh https://github.com/Mansideshman/AITester.git qabuddy.example.com
```

(If the repo is private, `git clone` inside the script will prompt for
credentials — easier to `scp` the whole `project9_QABuddyAI/` directory up
and run `deploy.sh` from a local checkout instead; see "Deploying from a
local checkout" below.)

## What it does

1. Installs system packages: Python 3, Node 20 (via NodeSource — the
   frontend build needs it), nginx, ufw, and certbot if a domain was given.
2. Creates a dedicated `qabuddyai` system user — the app never runs as root.
3. **Sparse-checks out** just `project9_QABuddyAI/` from the AITester
   monorepo into `/opt/qabuddyai/repo`, symlinked as `/opt/qabuddyai/app`.
4. Creates a venv, installs `requirements.txt`.
5. Builds the frontend (`npm install && npm run build`) — `qabuddy/api/app.py`
   auto-serves `frontend/dist` at `/`, so **one process serves both the API
   and the UI**. No separate frontend deploy needed for this to work.
6. Creates `.env` from `.env.example` if it doesn't exist yet (you still need
   to fill in your API key — see below).
7. Installs and starts `qabuddyai.service` via systemd (`--workers 1` —
   deliberate, see the comment in the unit file for why).
8. Installs the `qabuddyai-ingest.service`/`.timer` units but does **not**
   enable the timer — hourly auto-ingestion is a phase 2 feature, this just
   makes it a one-command opt-in later (see below).
9. Configures nginx as a reverse proxy in front of the app, with
   `proxy_buffering off` — required for `/api/chat` and `/api/ingest*`'s
   Server-Sent Events to stream live instead of arriving all at once when
   the connection closes.
10. Opens firewall ports for SSH + HTTP/HTTPS via `ufw`.
11. If you passed a domain, tells you the exact `certbot --nginx` command to
    run (certbot's first run is interactive — it asks for an email — so the
    script doesn't run it for you automatically).

Re-running `./deploy.sh` later (e.g. after a `git push`) pulls the latest
code, rebuilds, and restarts the service — safe to use as your update path.

## After deployment

1. **Set your API key**:
   ```bash
   sudo nano /opt/qabuddyai/app/.env      # set GROQ_API_KEY=...
   sudo systemctl restart qabuddyai
   ```
2. **Add your data** — `data/` is gitignored, so nothing real gets cloned.
   From your own machine:
   ```bash
   scp -r data/test_cases/vwo_test_cases_5000.csv root@<server-ip>:/opt/qabuddyai/app/data/test_cases/
   # repeat for whichever sources you have real content for
   ```
3. **Ingest**:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/ingest      # run on the server, or
   curl -X POST http://<server-ip>/api/ingest          # from anywhere, once nginx is up
   ```
   Or just open the dashboard and use the Sources page's Ingest/Upload
   buttons once you can reach it.
4. **Verify**: `curl http://<server-ip>/api/health` should return
   `{"status": "ok", ...}`. Open `http://<server-ip>/` (or your domain) in a
   browser for the dashboard.

## Enabling phase 2's hourly auto-ingestion

The unit is installed but inactive by default. To turn it on:

```bash
sudo systemctl enable --now qabuddyai-ingest.timer
sudo systemctl list-timers qabuddyai-ingest.timer   # confirm it's scheduled
```

Note this re-ingests **all** sources every hour unconditionally (deletes and
re-embeds each source_type's chunks from scratch) — it's the scheduling
wrapper the architecture doc always intended to hook in here, not true
change-detection (diffing what's actually new). For a large corpus that
re-embed cost adds up; only enable this once you've decided that tradeoff is
worth it for your update frequency.

## Managing the service

```bash
sudo systemctl status qabuddyai        # is it up?
sudo journalctl -u qabuddyai -f        # live logs
sudo systemctl restart qabuddyai       # after editing .env, etc.
```

## Connecting the Vercel frontend to this backend (optional)

If you'd rather keep using the frontend already deployed at
`qabuddyai-dashboard.vercel.app` instead of the copy this script builds and
serves itself, add a rewrite to `frontend/vercel.json` pointing `/api/*` at
this server (needs a domain + TLS — browsers block a HTTPS page from calling
an HTTP-only API):

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://qabuddy.example.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Then `vercel deploy --prod` again from `frontend/`. Otherwise, ignore this —
the VPS serves a fully working copy of the UI on its own (step 5 above).

## Deploying from a local checkout (private repo / no git access on server)

```bash
rsync -avz --exclude node_modules --exclude .venv --exclude dist \
  --exclude qdrant_data --exclude .env \
  project9_QABuddyAI/ root@<server-ip>:/opt/qabuddyai/app/
ssh root@<server-ip>
cd /opt/qabuddyai/app
# run the steps in deploy.sh manually from "Setting up Python environment"
# onward — skip the git clone section since the files are already there.
```

## Troubleshooting

- **`RuntimeError: Storage folder ... is already accessed by another
  instance of Qdrant client`** — the embedded/local Qdrant client only
  allows one process to hold its file-store open at a time. Don't run
  `python -m qabuddy.ingest` by hand while `qabuddyai.service` is running;
  use `curl -X POST http://127.0.0.1:8000/api/ingest` instead (goes through
  the already-running app's own client — this is exactly why
  `qabuddyai-ingest.service` is written as a `curl` call, not a second
  Python process).
- **Ingestion is extremely slow / server seems to hang** — check
  `free -h`. If swap is maxed out, the server is undersized for bge-m3;
  either upsize it or reduce `INGEST_BATCH` in `.env` (default 16 — try 4-8)
  to lower peak memory during embedding.
- **502 from nginx** — `qabuddyai.service` probably isn't running or hasn't
  finished loading the models yet on first request; check
  `journalctl -u qabuddyai -f`.
- **`certbot --nginx` fails** — make sure the domain's DNS A record actually
  points at the server's IP before running it (Let's Encrypt validates via
  HTTP challenge).
