# Advanced RAG Explorer

End-to-end teaching demo for The Testing Academy. Upgrades `BasicRAG`
with techniques that matter at scale on a real corpus (5,000 VWO test cases):

- **Hybrid retrieval** — `bge-m3` produces dense + sparse vectors from one model
- **Vector DB** — Qdrant, embedded (file-store) by default — no Docker required
- **Re-ranking** — `BAAI/bge-reranker-v2-m3` cross-encoder
- **Query rewriting** — 3 alternate phrasings via an LLM before retrieval
- **Generation** — grounded answers, with a "generate a new test case" mode

UI uses a Claude-inspired theme (warm cream + coral) with a two-pane layout:
left = pipeline stage tracker (live via Server-Sent Events), right = active
content / chat.

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
  bge-m3 (dense + sparse) -> Qdrant collection 'vwo_test_cases'

Stage 2 (Chat):
  Question -> rewrite (LLM) -> embed -> dense + sparse search ->
  RRF fuse -> bge-reranker-v2-m3 -> LLM -> grounded answer
```

---

## Setup

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

---

## What you can see in the UI

### `/upload`
- File picker accepts `.csv`, `.xlsx`, `.xls`.
- After upload: row count, columns, first 5 rows, dtypes.
- Pick text columns (concatenated into the embedded document) and metadata
  columns (kept in Qdrant payload for filtering).

### `/ingest` (live via SSE)
- Stage tracker shows: Read -> Build docs -> Chunk -> Embed -> Index.
- For each stage, a card on the right shows what happened:
  - **Chunk**: histogram, total chunks, avg/min/max chars, sample chunks.
  - **Embed**: progress bar, dense vector preview (first 8 dims), sparse
    top-5 tokens by weight.
  - **Index**: Qdrant collection info.

### `/chunks`
- Paginated viewer (50/page) over the entire collection.
- Search box (substring, via Qdrant full-text index) + filters (`priority`,
  `module`, `jira_id`).
- Each chunk card: id, payload, dense preview, sparse preview, full text.
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
