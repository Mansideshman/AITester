# Deploying JobHunt Copilot to a VPS

Everything here is provider-agnostic — DigitalOcean, Hetzner, Oracle Cloud,
AWS Lightsail, a work server, whatever you can SSH into as root. Nothing in
`deploy.sh` is DigitalOcean-specific. Mirrors the same pattern used for
QABuddyAI (`project9_QABuddyAI/deploy/`) — one process serves both the API
and the built frontend, systemd keeps it running, nginx reverse-proxies it.

## Prerequisites

- A **Ubuntu 22.04 or 24.04** server, reachable over SSH as root (or a user
  with passwordless `sudo`).
- **Sizing**: this app is lightweight (Express + SQLite, no ML models loaded
  in-process) — the smallest available droplet (1 vCPU / 512MB–1GB RAM) is
  plenty, unlike QABuddyAI's bge-m3/reranker requirements.
- 5GB+ disk (the SQLite database grows with however many jobs you fetch and
  track — trivial for personal use).
- Optional: a **JSEARCH_API_KEY** (free tier, recommended — see the main
  `README.md`'s "Fetch source priority" section) or `APIFY_TOKEN` (paid) to
  fetch real jobs instead of mock data. `ANTHROPIC_API_KEY` optional too, for
  real (vs. heuristic) scoring/tailoring/drafting.
- Optional: a domain name pointed at the server's IP, if you want TLS.

## Quick start

SSH into the server as root, then:

```bash
curl -O https://raw.githubusercontent.com/Mansideshman/AITester/master/JobHuntAutomation/deploy/deploy.sh
chmod +x deploy.sh
./deploy.sh                                    # HTTP only, no domain
# or:
./deploy.sh https://github.com/Mansideshman/AITester.git jobhunt.example.com
```

(If the repo is private, `git clone` inside the script will prompt for
credentials — easier to `scp` the whole `JobHuntAutomation/` directory up
and run the steps manually instead; see "Deploying from a local checkout"
below.)

## What it does

1. Installs system packages: Node 20 (via NodeSource), nginx, ufw, and
   certbot if a domain was given. No Python/venv needed — this stack is
   pure Node.
2. Creates a dedicated `jobhuntcopilot` system user — the app never runs as
   root.
3. **Sparse-checks out** just `JobHuntAutomation/` from the AITester
   monorepo into `/opt/jobhuntcopilot/repo`, symlinked as
   `/opt/jobhuntcopilot/app`.
4. Creates `backend/.env` from `.env.example` if it doesn't exist yet, with
   `DATABASE_URL` pointed at `/opt/jobhuntcopilot/data/prod.db` — **outside**
   the repo checkout, so a `git pull` + rebuild on redeploy never touches
   real data. You still need to fill in an API key — see below.
5. Installs backend deps, runs `prisma migrate deploy`, builds the backend,
   and runs the idempotent seed script (only inserts Profile/SearchConfig if
   they don't already exist — safe to run on every redeploy).
6. Builds the frontend (`npm install && npm run build`) —
   `backend/src/index.ts` auto-serves `frontend/dist` at `/` once it exists,
   so **one process serves both the API and the UI**. No separate frontend
   deploy needed.
7. Installs and starts `jobhuntcopilot.service` via systemd.
8. Configures nginx as a reverse proxy in front of the app.
9. Opens firewall ports for SSH + HTTP/HTTPS via `ufw`.
10. If you passed a domain, tells you the exact `certbot --nginx` command to
    run (certbot's first run is interactive — it asks for an email — so the
    script doesn't run it for you automatically).

Re-running `./deploy.sh` later (e.g. after a `git push`) pulls the latest
code, rebuilds, and restarts the service — safe to use as your update path.
Your data in `/opt/jobhuntcopilot/data/prod.db` is untouched by this.

## After deployment

1. **Set your fetch/AI keys**:
   ```bash
   sudo nano /opt/jobhuntcopilot/app/backend/.env      # set JSEARCH_API_KEY=...
   sudo systemctl restart jobhuntcopilot
   ```
2. **Verify**: `curl http://<server-ip>/api/health` should return
   `{"ok": true}`. Open `http://<server-ip>/` (or your domain) in a browser
   for the dashboard.
3. Go to **Search & Fetch** and click **Fetch All Sources** to pull real
   jobs (or any of the three fetch buttons — see the main README for what
   each does).

## Managing the service

```bash
sudo systemctl status jobhuntcopilot        # is it up?
sudo journalctl -u jobhuntcopilot -f        # live logs
sudo systemctl restart jobhuntcopilot       # after editing .env, etc.
```

## Backing up your data

Everything (jobs, tracker, resume versions, drafts, profile, search config)
is one SQLite file:

```bash
scp root@<server-ip>:/opt/jobhuntcopilot/data/prod.db ./jobhuntcopilot-backup.db
```

## Deploying from a local checkout (private repo / no git access on server)

```bash
rsync -avz --exclude node_modules --exclude dist --exclude .env \
  JobHuntAutomation/ root@<server-ip>:/opt/jobhuntcopilot/app/
ssh root@<server-ip>
cd /opt/jobhuntcopilot/app
# run the steps in deploy.sh manually from "Configuring environment" onward
# — skip the git clone section since the files are already there.
```

## Troubleshooting

- **502 from nginx** — `jobhuntcopilot.service` probably isn't running or
  crashed on startup; check `journalctl -u jobhuntcopilot -f`. A common
  cause is a missing/invalid `DATABASE_URL` in `.env`, or the frontend not
  having been built yet (`frontend/dist` missing).
- **`certbot --nginx` fails** — make sure the domain's DNS A record actually
  points at the server's IP before running it (Let's Encrypt validates via
  HTTP challenge).
- **Fetch buttons return mock data instead of real jobs** — check
  `curl http://127.0.0.1:8420/api/settings` on the server; if
  `jsearch.configured` and `apify.configured` are both `false`, your `.env`
  keys aren't set or the service wasn't restarted after editing it.
