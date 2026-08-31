# RAG Explorer

A minimal, fully-visible Retrieval-Augmented Generation pipeline. Upload a PDF, TXT, MD,
DOC, or DOCX file (or use the bundled VWO Product Requirements Document by default) and
the React UI shows every stage of the pipeline as it happens: ingestion → chunking →
embedding (Nomic) → storage (ChromaDB) → retrieval → answer generation (Groq).

**Live at:** [basic-rag-explorer-five.vercel.app](https://basic-rag-explorer-five.vercel.app)

Like `AdvancedRAG`, this runs on **two backends** picked automatically at runtime
(`backend/app/config.py`'s `VECTOR_BACKEND`, based on which env vars are set):

| | Local (default) | Deployed on Vercel |
|---|---|---|
| Embeddings | `nomic-embed-text-v1.5`, run locally (torch) | Upstash Vector's hosted embedding |
| Vector store | ChromaDB, persisted to disk | Upstash Vector (its own `basicrag` namespace) |
| Ingestion trigger | Auto-ingest on backend startup | Pre-ingested once from local machine; `/api/status` reconciles with the real store on every cold start |

**Why?** `sentence-transformers` alone pulls in `torch` (~1.6GB installed) — Vercel's
Hobby-plan functions cap at 500MB, so no local embedding model can run there at all (the
same wall hit deploying `AdvancedRAG`). Upstash Vector shares one free-tier index with
`AdvancedRAG`, kept separate via a `basicrag` namespace. Local dev is unaffected.

## Architecture

- **Backend** (`backend/`): FastAPI app. On startup it automatically ingests the default
  PDF in `data/`. Uploading a new file via `/api/upload` (PDF, TXT, MD, DOC, or DOCX)
  saves it to `backend/uploads/` and becomes the new active source for all subsequent
  ingestion/re-ingestion. `backend/app/document_loader.py` dispatches by extension: `pypdf`
  for PDF, plain-text read for TXT/MD, `python-docx` for DOCX, and a headless LibreOffice
  (`soffice --convert-to txt`) conversion for legacy DOC. The document is split into
  overlapping chunks, each embedded locally with the `nomic-ai/nomic-embed-text-v1.5`
  model (via `sentence-transformers`, no API key needed), and stored in a local persistent
  ChromaDB collection (`backend/chroma_db/`). Queries embed the question, retrieve the
  top-4 most similar chunks from ChromaDB, and send them as context to Groq's
  `openai/gpt-oss-120b` model to generate the final answer.
- **Frontend** (`frontend/`): React + Vite app that polls ingestion status, renders the
  pipeline stepper and an Ingestion panel (drag-and-drop/browse file upload, source
  folder, stats, sample embedding, chunk preview, plus manual **Re-ingest** / **Reset**
  controls), and provides the query UI. Talks to the backend at `/api/*` (proxied to
  `http://localhost:8000` in dev).

## Prerequisites

- Python 3.8+ (a virtualenv is already set up at `backend/venv`)
- Node.js 20+ (the system default Node is too old for Vite; use `nvm use 20`)
- A free Groq API key: https://console.groq.com/keys
- LibreOffice (`soffice` on PATH) — only needed to ingest legacy `.doc` files; PDF, TXT,
  MD, and DOCX work without it.

## 1. Configure the Groq API key

Edit `backend/.env` and set:

```
GROQ_API_KEY=your_key_here
```

Without this, ingestion/retrieval/chunk-browsing all work, but the final answer-generation
step will return an error until a key is set.

## 2. Run the backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

On startup it automatically ingests `data/Product Requirements Document_(PRD)_VWO.com.pdf`.
Check progress at `http://localhost:8000/api/status`.

(If you ever need to reinstall dependencies: `pip install -r requirements.txt`. Note
`chromadb` and `posthog` are pinned to older versions for Python 3.8 compatibility, and
`pysqlite3-binary` is used to work around the system's outdated SQLite via a runtime
`sys.modules` swap at the top of `app/main.py`.)

## 3. Run the frontend

```bash
cd frontend
nvm use 20   # or any Node 20+
npm install  # first time only
npm run dev
```

Open `http://localhost:5173`.

## Deploying to Vercel

1. **Vector store**: create a free Upstash Vector index (Hybrid type, dense embedding
   model = hosted, sparse = BM25) at [upstash.com](https://upstash.com), or reuse an
   existing one — this app only needs its own namespace, not a dedicated index.
2. **Link and configure**:
   ```bash
   vercel link
   vercel env add UPSTASH_VECTOR_REST_URL production preview development
   vercel env add UPSTASH_VECTOR_REST_TOKEN production preview development
   vercel env add UPSTASH_NAMESPACE production preview development   # e.g. "basicrag"
   vercel env add GROQ_API_KEY production preview development
   vercel deploy --prod
   ```
3. **Ingest the default PDF** (or your own document) into that namespace from your local
   machine with `UPSTASH_*` env vars set in `backend/.env` — the deployed app only reads,
   it never runs the multi-minute local-ingest path itself:
   ```bash
   cd backend && source venv/bin/activate
   python -c "from app import pipeline; print(pipeline.ingest(force=True))"
   ```

Notes on the deployment itself:
- `api/index.py` re-exports the FastAPI `app` for Vercel's Python runtime; `vercel.json`
  builds `frontend/` as the static site and rewrites `/api/*` to that one function.
- `api/requirements.txt` is a separate, much leaner dependency set than
  `backend/requirements.txt` — no `sentence-transformers`/`torch`/`chromadb`.
- `.doc` uploads aren't supported in this deployment (no LibreOffice binary available
  serverless) — PDF, TXT, MD, and DOCX all work fine.
- Uploads write to `/tmp` (ephemeral) rather than `backend/uploads/`, since Vercel's
  filesystem is read-only outside `/tmp`.

## How it works, end to end

1. **Read document** — `backend/app/document_loader.py` extracts text based on file type:
   `pypdf` per-page for PDF, a direct read for TXT/MD, `python-docx` for DOCX, and a
   LibreOffice headless conversion to text for legacy DOC.
2. **Chunk** — text is normalized and split into ~800-character chunks with 150-character
   overlap, breaking on sentence boundaries where possible (`backend/app/chunker.py`).
3. **Embed** — each chunk is embedded with Nomic Embed (768 dims), prefixed with
   `search_document: ` as Nomic recommends (`backend/app/embeddings.py`).
4. **Store** — vectors + text + metadata (page, chunk index) are upserted into a local
   ChromaDB collection (`backend/app/vectorstore.py`).
5. **Query** — a question is embedded with the `search_query: ` prefix, ChromaDB returns
   the top 4 most similar chunks by cosine similarity.
6. **Generate** — the 4 chunks are passed as context to Groq's `openai/gpt-oss-120b` model,
   which answers strictly from that context.

All of this is surfaced in the UI: the pipeline stepper shows live status/timings for
steps 1–4, the Ingestion panel lets you re-run or reset ingestion and inspect every stored
chunk (including a sample embedding vector), and each query shows the exact top-4 chunks
retrieved (with similarity scores) alongside the generated answer, with the matching
chunks highlighted back in the Ingestion panel.

## API reference

| Endpoint            | Method | Description                                             |
| -------------------- | ------ | -------------------------------------------------------- |
| `/api/health`         | GET    | Liveness check.                                          |
| `/api/status`          | GET    | Current pipeline status, stats, and step timings.        |
| `/api/chunks`          | GET    | All stored chunks with an embedding preview.             |
| `/api/ingest`          | POST   | Re-run ingestion on the current active source (used by "Re-ingest"). |
| `/api/upload`          | POST   | Multipart file upload (`file` field) — PDF/TXT/MD/DOC/DOCX. Saves the file, makes it the active source, and ingests it. |
| `/api/reset`           | POST   | Clear the ChromaDB collection and reset pipeline state.  |
| `/api/query`           | POST   | `{ "question": "..." }` → top-4 retrieved chunks + generated answer. |

## Configuration

All tunables live in `backend/.env` (see `backend/.env.example`): `GROQ_MODEL`,
`EMBEDDING_MODEL`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `TOP_K`, `COLLECTION_NAME`,
`MAX_UPLOAD_MB` (default 20).
