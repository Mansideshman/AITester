# QABuddyAI

A multi-source hybrid-RAG QA assistant: ask a question, get a cited answer
grounded in your Selenium framework, Playwright framework, test case
repository, JIRA history, PRDs, meeting notes, and Jenkins CI logs.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design rationale (embedding
model, vector DB, chunking strategy, preprocessing, terminology),
[qabuddy-ai-build-prompt.md](qabuddy-ai-build-prompt.md) for the formal
build spec, and [prompt.md](prompt.md) for the original informal
requirements brain-dump.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add GROQ_API_KEY (or OPENROUTER_API_KEY)
```

Qdrant runs **embedded** by default (file store at `./qdrant_data/`) — no
Docker required. Set `QDRANT_URL` in `.env` to point at a standalone Qdrant
server instead.

## Add your data

Drop files into the matching `data/<source>/` folder — see each folder's
own `README.md` for expected format. A 5,000-row sample test-case CSV is
already seeded in `data/test_cases/` so you can smoke-test the pipeline
immediately.

## Ingest

```bash
python ingest.py                # ingest every source_type
python ingest.py test_case      # ingest just one
```

Safe to re-run per source_type at any time — it fully replaces that
source_type's chunks (deletes then re-indexes), leaving every other
source_type's data untouched.

## Run the API

```bash
python main.py
# or: uvicorn qabuddy.api.app:app --reload
```

- `GET /api/health` — status + Qdrant collection info
- `GET /api/sources` — per-source ingestion status
- `POST /api/ingest/{source_type}` / `POST /api/ingest` — SSE-streamed ingestion
- `POST /api/chat` — `{"question": "..."}` → SSE-streamed cited answer

The first request that touches embed/rerank downloads and loads the models
(bge-m3 ~2.3GB, bge-reranker ~1.1GB on first run) — subsequent requests
reuse the already-loaded model.

## Frontend

A React + TypeScript dashboard (Vite, Tailwind v4, shadcn/ui, dark-mode)
lives in `frontend/`: a Chat page (live rewrite/retrieve/rerank/generate
stage tracker, cited + markdown-rendered answers, source-type filtering)
and a Sources page (per-source ingestion status, a file-picker **upload**
straight into a source's `data/` folder, one-click ingest with live
progress, "ingest all").

This machine's system Node (v10) is too old for Vite — use `nvm use 20`
(or later) for all frontend commands.

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api -> :8000
```

If the backend runs on a different port locally (e.g. another project
already has :8000), add `frontend/.env.local`:

```
VITE_API_PROXY_TARGET=http://127.0.0.1:<port>
```

`npm run build` produces `frontend/dist/`, which `qabuddy/api/app.py`
serves automatically (mounted at `/`, alongside the `/api/*` routes) if
present — so a single `uvicorn` process can serve both API and UI in
production.

## What's not built yet (see ARCHITECTURE.md for the full list)

Live JIRA MCP/JQL integration, Figma ingestion, audio transcription, and
hourly auto-ingestion are explicitly phase 2.
