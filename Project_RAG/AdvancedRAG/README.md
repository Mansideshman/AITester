# Advanced RAG Explorer

End-to-end teaching demo. Upgrades `BasicRAG`
with techniques that matter at scale on a real corpus (5,000 VWO test cases):

- **Hybrid retrieval** — dense + sparse vectors, fused with Reciprocal Rank Fusion
- **Re-ranking** — a cross-encoder re-reads the top candidates before generation
- **Query rewriting** — 3 alternate phrasings via an LLM before retrieval
- **Generation** — grounded answers, with a "generate a new test case" mode

UI uses a Claude-inspired theme (warm cream + coral) with a two-pane layout:
left = pipeline stage tracker (live via Server-Sent Events), right = active
content / chat.

This app runs on **two different backends**, picked automatically at runtime
by `rag/config.py` based on which env vars are set — same code, same UI,
same pipeline shape, different infrastructure underneath:

| | Local (default) | Deployed on Vercel |
|---|---|---|
| Dense + sparse embeddings | `bge-m3`, run locally (torch) | Upstash Vector's hosted embedding + BM25 |
| Vector store | Qdrant, embedded file-store — no Docker | Upstash Vector (hosted hybrid index) |
| Reranker | `BAAI/bge-reranker-v2-m3`, run locally (torch) | Cohere Rerank (hosted) |
| Generation / rewriting | Groq | Groq |

**Why two backends?** Vercel Hobby-plan functions cap at **500MB** — `torch`
alone is ~730MB installed, so bge-m3 and the local reranker simply cannot fit
in a deployed function no matter how the dependencies are trimmed (verified
by direct measurement, not assumption). Swapping in hosted equivalents for
just the embedding and rerank steps keeps the full pipeline shape intact —
rewrite → hybrid retrieve → RRF fuse → rerank → generate — while making the
deployed function a lean ~10MB with zero ML dependencies. Local dev is
unaffected: with no `UPSTASH_VECTOR_REST_URL`/`COHERE_API_KEY` set, it's the
original all-local pipeline.

> **Provider note:** the original spec called for Openrouter. This machine
> only has a `GROQ_API_KEY` provisioned (same one `BasicRAG` uses), so both
> query rewriting and generation default to Groq's OpenAI-compatible API.
> Set `OPENROUTER_API_KEY` in `.env` to switch providers — no code changes
> needed, see `rag/config.py`.

---

## Pipeline

```
Stage 1 (Ingest):
  CSV/XLSX -> rows -> assemble docs -> chunk (1 row = 1 chunk if small) ->
  dense + sparse embed -> index (Qdrant locally / Upstash Vector on Vercel)

Stage 2 (Chat):
  Question -> rewrite (LLM) -> hybrid search (dense + sparse) ->
  RRF fuse -> rerank (bge-reranker locally / Cohere on Vercel) -> LLM -> answer
```

---

## Setup (local, full pipeline with bge-m3 + Qdrant)

```bash
cd AdvancedRAG
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add GROQ_API_KEY (or OPENROUTER_API_KEY)
```

Qdrant runs **embedded** by default (file store at `./qdrant_data/`) — **no Docker
required**. To use a Qdrant server instead, set `QDRANT_URL=http://host:6333`
in `.env`.

---

## Run

```bash
source .venv/bin/activate
python app.py
# open http://127.0.0.1:5050
```

The first request that touches the embed/rerank stages downloads and loads
the models (bge-m3 ~2.3 GB, bge-reranker ~1.1 GB first time from the HF
cache) — subsequent requests reuse the already-loaded model.

### CLI ingestion (optional)

```bash
python ingest.py testcase/vwo_test_cases_5000.csv \
  --text-cols title,steps,expected,tags \
  --meta-cols id,jira_id,priority,module
```

Backend is auto-selected the same way the web app does — this is also how
the full corpus gets into Upstash for the Vercel deployment (see below):
ingestion is a one-time offline step, not something the live deployed app
does for the full 5,000 rows.

---

## Deploying to Vercel

The deployed version swaps local bge-m3 + Qdrant + bge-reranker for hosted
equivalents (Upstash Vector + Cohere Rerank) — see the backend comparison
table above for why. To stand up your own copy:

1. **Create the vector store**: sign up free at [upstash.com](https://upstash.com) →
   Vector → Create Index → type **Hybrid**, dense embedding model
   `text-embedding-3-small` (Upstash-hosted, no OpenAI key needed), sparse
   model **BM25**. Copy the index's REST URL + token.
2. **Get a reranker key**: sign up free at [dashboard.cohere.com](https://dashboard.cohere.com) →
   API keys → copy the trial key.
3. **Link and configure the Vercel project**:
   ```bash
   vercel link
   vercel env add UPSTASH_VECTOR_REST_URL production preview development
   vercel env add UPSTASH_VECTOR_REST_TOKEN production preview development
   vercel env add COHERE_API_KEY production preview development
   vercel env add GROQ_API_KEY production preview development
   vercel deploy --prod
   ```
4. **Ingest the corpus** into the same Upstash index from your local machine
   (see CLI ingestion above) — the deployed app only *reads* from it.

Notes on the deployment itself:
- `api/index.py` re-exports the Flask `app` for Vercel's Python runtime;
  `vercel.json` rewrites every path to that one function.
- `api/requirements.txt` is a separate, much leaner dependency set than the
  root `requirements.txt` used for local dev — no torch/transformers/
  qdrant-client, since the deployed function never runs a local model.
- Upstash's free tier caps at **10,000 writes/day** — comfortably covers
  querying, but a fresh 5,000-row ingest plus iterative testing can exhaust
  it; the daily limit resets every 24h.

---

## What you can see in the UI

### `/upload` — Upload &amp; Ingest
- File picker accepts `.csv`, `.xlsx`, `.xls`.
- After upload: row count, columns, first 5 rows, dtypes.
- Pick text columns (concatenated into the embedded document) and metadata
  columns (kept as payload, filterable) — then **Start Ingestion** streams
  live progress through the same page: Read → Build docs → Chunk → Embed →
  Index.
  - **Chunk** card: histogram, total chunks, avg/min/max chars, sample chunks.
  - **Embed** card: dense vector preview + sparse top-5 tokens locally, or a
    note explaining hosted embedding on Vercel.
  - **Index** card: collection/index info.

### `/chunks`
- Paginated viewer (50/page) over the entire collection.
- Search box (substring) + filters (`priority`, `module`, `jira_id`).
- Each chunk card: id, payload, dense/sparse preview (local backend only),
  full text.
- Chunks used in the most recent chat answer are outlined in coral.

### `/chat`
- Chat box on the right; pipeline stage tracker on the left updates per query.
- After each turn, a detail card shows:
  - The query rewrites
  - Dense top-N vs sparse top-N vs RRF-fused top-N
  - Re-rank before/after
  - Final answer with `[Chunk N]` citations
- Two modes auto-detected:
  - **Answer**: grounded Q&A on test cases.
  - **Generate**: phrases like "create a new test case for JIRA VWO-1234"
    produce a structured test case (Title / Preconditions / Steps / Expected
    / Priority / Tags) using retrieved similar test cases as templates.

---

## Tunables (`.env`, see `rag/config.py` for defaults)

| Knob               | Default | Meaning                                          |
|--------------------|---------|--------------------------------------------------|
| `CHUNK_SIZE`       | 1000    | Max chars per chunk before splitting             |
| `CHUNK_OVERLAP`    | 150     | Chars repeated between adjacent chunks           |
| `TOP_N_HYBRID`     | 20      | Candidates per dense / sparse search             |
| `TOP_K_RERANK`     | 4       | Final chunks sent to LLM after rerank            |
| `RRF_K`            | 60      | Reciprocal Rank Fusion smoothing constant        |
| `REWRITE_ENABLED`  | True    | Generate alt phrasings before search             |

---

## Troubleshooting

- **Connection refused on 6333** — only relevant if you set `QDRANT_URL` to a server. Default is embedded; nothing to start.
- **401 from Groq/Openrouter** — `.env` is missing or the API key is wrong.
- **First query is slow** — bge-m3 + reranker downloading + warming (CPU-only on this box, no GPU). Subsequent calls are much faster since the models stay loaded in the process.
- **Out-of-memory on bge-m3** — reduce `INGEST_BATCH` (default 16); this machine has limited free RAM, so close other heavy apps before ingesting the full 5,000-row corpus.
- **Port 5050 busy** — change `PORT` env var.

---

## Test data

`testcase/vwo_test_cases_5000.csv` — 5,000 synthetic VWO test cases in a
Jira test-case-import shape (columns: `id, jira_id, title, module, priority,
test_type, tags, preconditions, steps, expected, status, created_date`),
generated deterministically by `testcase/generate_test_cases.py` across ~27
VWO product modules (A/B testing, personalization, feature flags, server-side
testing, etc.) crossed with browser/device/role/environment variants —
mirroring a real cross-browser regression suite exported from Jira.
