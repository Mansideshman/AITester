# QABuddyAI — Architecture (Phase 1)

Answers to the questions from `prompt.md` / `qabuddy-ai-build-prompt.md`
(embedding model, vector DB, folder structure, chunk size/overlap,
terminology, preprocessing), and the design behind the phase 1 build.

## Why reuse `project08_RAG/AdvancedRAG`'s core

This repo already has a proven, working hybrid-RAG pipeline: bge-m3
dense+sparse embeddings, Qdrant, a bge-reranker cross-encoder, RRF fusion,
Groq generation — built for a Vercel deployment that had to juggle a
hosted fallback (Upstash Vector + Cohere Rerank) because Vercel's function
size limit can't fit `torch`. A DigitalOcean VPS doesn't have that
constraint, so QABuddyAI runs the same core with the Vercel/hosted-fallback
branches simply removed — same proven pipeline, less code.

## Embedding model: `BAAI/bge-m3`

One model produces both a dense (1024-dim, semantic) vector and a sparse
(lexical/BM25-like) vector in a single forward pass — no separate keyword
index to maintain. Runs locally via `FlagEmbedding`, no API key/cost. This
is what makes the retrieval "hybrid": dense catches semantic matches
("how do I wait for an element" ≈ "explicit wait util"), sparse catches
exact-term matches (a JIRA key, an error message, a class name) that dense
embeddings can blur.

## Vector DB: Qdrant, embedded mode

Runs as an embedded file-store (`./qdrant_data/`, no Docker) — sufficient
for a single-process VPS deployment. Natively supports named dense +
sparse vectors per point and payload filtering, which is what the
multi-source metadata schema below relies on. `QDRANT_URL` is kept in
config so pointing at a standalone Qdrant server later needs zero code
changes.

**One collection for all 10 sources**, not ten separate ones, filtered by a
`source_type` payload field. Most useful QA questions are inherently
cross-source — "why did this test fail" needs the Jenkins log *and* the
Selenium test code *and* the JIRA history in one retrieval pass. Ten
collections would mean ten separate searches plus a manual re-fusion step
just to answer one question; RRF fusion + payload filtering already give
per-source scoping for free within one collection.

## Chunk size / overlap: per source type, not one-size-fits-all

| source_type | chunk size / overlap | why |
|---|---|---|
| `selenium_code`, `playwright_code` | 800 / 100 | Code is denser per character than prose; the method/function is the natural retrieval unit, and it rarely needs 1000 chars of surrounding context. |
| `test_case` | 1000 / 150 (row-level) | One CSV/XLSX row is usually one logical unit; the size only matters as a fallback if a single row's text is unusually long. |
| `jira_ticket` | 1200 / 150 | Ticket description + comments run a bit longer than a test-case row; sized so most tickets stay one chunk for cleaner citations. |
| `company_doc`, `prd_doc`, `meeting_note`, `lucidchart` | 1000 / 150 | Standard prose default. |
| `jenkins_log` | 1500 / 200 | Stack traces need more room to stay coherent as one retrievable unit — smaller chunks would fragment a trace across 2-3 chunks and hurt failure-analysis answers. |

All chunking uses one whitespace-boundary-snapping sliding-window splitter
(`qabuddy/chunking.py`), parameterized per source_type via
`qabuddy/config.py`'s `SOURCE_TYPES` dict — no LangChain dependency.

## Terminology: the `source_type` schema

Every indexed chunk carries a `source_type` (mandatory) plus common fields
`text`, `source_id`, `chunk_index`, `title`, `ingested_at`, plus
per-source-type extras:

| source_type | data/ folder | extra payload fields |
|---|---|---|
| `selenium_code` | `selenium_repo/` | `repo_name`, `file_path`, `class_name`, `method_name`, `start_line`, `end_line`, `language` |
| `playwright_code` | `playwright_repo/` | `repo_name`, `file_path`, `symbol_name`, `start_line`, `end_line`, `language` |
| `test_case` | `test_cases/` | `id`, `jira_id`, `priority`, `module`, `test_type`, `tags`, `status` |
| `jira_ticket` | `jira_tickets/` | `jira_id`, `status`, `issue_type`, `priority`, `assignee`, `created_date`, `updated_date` |
| `company_doc` | `company_docs/` | `doc_name`, `page` |
| `prd_doc` | `prd_docs/` | `doc_name`, `page` |
| `meeting_note` | `meeting_notes/` | `doc_name`, `meeting_date` |
| `lucidchart` | `lucidchart/` | `doc_name`, `diagram_name` |
| `jenkins_log` | `jenkins_logs/` | `job_name`, `build_id`, `test_name`, `status` |
| `figma_design` | `figma_designs/` | *(reserved, phase 2 — no loader yet)* |

`FILTERABLE_FIELDS` in `qabuddy/vectorstore.py` (payload-indexed for fast
filtering): `source_type`, `priority`, `module`, `test_type`, `status`,
`jira_id`, `repo_name`, `doc_name`.

## Preprocessing & text normalization

Normalization is deliberately **not uniform** — what counts as "clean"
differs by source type, and over-normalizing can destroy exactly the
structure that makes a chunk useful:

- **PDFs** (`company_doc`, `prd_doc`) — `pypdf`'s `extract_text()` breaks
  lines at the PDF's internal layout (column widths, hyphenation,
  headers/footers), not at sentence boundaries. `qabuddy/pdf_loader.py`
  collapses those whitespace runs to single spaces (`_normalize_pdf_text`)
  so extracted text reads as normal prose again.
- **`.txt`/`.md`/`.docx`** (`meeting_note`, `lucidchart`, and non-PDF
  `company_doc`/`prd_doc`) — passed through **unchanged**. These already
  come out clean, and collapsing whitespace would flatten markdown
  structure (headings, bullet lists) that's worth keeping for citation
  readability.
- **CSV/XLSX rows** (`test_case`, `jira_ticket` CSV export) —
  `qabuddy/docs.py`'s `assemble_docs()` normalizes *within* each cell
  (collapses embedded newlines to spaces via `_normalize_cell`) but
  preserves the `"column: value"` line-per-column structure across cells —
  otherwise a multi-line cell (e.g. a "steps" field with literal newlines)
  could be misread as starting a new column.
- **Code** (`selenium_code`, `playwright_code`) and **logs**
  (`jenkins_log`) — **never whitespace-normalized**. Indentation and line
  breaks are semantically meaningful (code formatting, stack trace
  structure), and citations that show a code/log snippet need to look like
  the original file.
- **Terminology/metadata**: every loader maps its source's native field
  names onto the common schema above (e.g. JIRA's `issuetype` →
  `issue_type`) rather than leaking inconsistent source-specific
  vocabulary into the payload — see the per-`source_type` extra-fields
  table above.
- **Encoding**: all plain-text reads use `errors="replace"` so a
  mis-encoded file degrades gracefully (replacement characters) instead of
  crashing the whole ingest run.

## Retrieval pipeline (`POST /chat`)

```
question -> rewrite (LLM, 3 alternate phrasings) ->
  for each rewrite: dense search + sparse search (top 20 each) ->
  merge across rewrites (best rank) -> RRF fuse dense+sparse ->
  cross-encoder rerank (bge-reranker-v2-m3, top 4) ->
  LLM answer, grounded only in the retrieved chunks, cited per source_type
```

Streamed via Server-Sent Events (`rewrite → retrieve → rerank → generate →
done`), same shape as AdvancedRAG's proven `/api/chat`.

## Ingestion pipeline (`POST /ingest/{source_type}` or `POST /ingest`)

```
scan data/<folder> -> source-specific loader -> Document{source_id, title, text, meta} ->
  generic chunker (per-source size/overlap) -> bge-m3 embed (dense+sparse) ->
  delete old chunks for this source_type -> upsert into Qdrant
```

Idempotent per source_type: re-running ingestion for one source deletes and
replaces only that source_type's chunks (`vectorstore.delete_source_type`),
leaving every other source untouched — so re-ingesting an updated test-case
CSV doesn't require re-ingesting the Selenium repo too.

## Deployment (any VPS — not DigitalOcean-specific)

`uvicorn qabuddy.api.app:app --workers 1`, behind nginx for TLS.
**One worker is deliberate**: bge-m3 + bge-reranker-v2-m3 are loaded
in-process (~2.3GB+ combined) and extra workers would each load their own
copy, multiplying RAM for no throughput benefit at QA-team query volumes.
Embedded Qdrant's file-store also only supports one writer process, which
matches `--workers 1` naturally.

**Fully built, in `deploy/`** — a real, tested, idempotent deploy path, not
just a plan:
- `deploy/deploy.sh` — one script, run as root on any fresh Ubuntu 22.04+
  server (provider-agnostic; nothing DigitalOcean-specific): installs
  dependencies, sparse-checks out `project9_QABuddyAI/` from this monorepo,
  builds the frontend, installs systemd units, configures nginx (with
  `proxy_buffering off` for SSE) and `ufw`, and sets up TLS via certbot if a
  domain is given. Safe to re-run as the update path.
- `deploy/qabuddyai.service` — the app itself.
- `deploy/qabuddyai-ingest.service` + `.timer` (`OnCalendar=hourly`,
  installed but **not enabled by default**) — this is where **phase 2's
  hourly auto-ingestion** plugs in. Note it triggers ingestion via
  `curl -X POST http://127.0.0.1:8000/api/ingest` against the already-running
  app, not a second `python -m qabuddy.ingest` process — embedded Qdrant's
  file-store only allows one process to hold it open at a time, so a
  separate process would fail with a lock conflict while the service is up.
- `deploy/nginx-qabuddyai.conf` — reverse proxy template.
- `deploy/README.md` — full guide: prerequisites, sizing guidance, quick
  start, post-deploy steps, troubleshooting.

See `deploy/README.md` for the actual deployment instructions.

## What phase 1 explicitly does NOT do

- **Live JIRA API/MCP pull via JQL** — `qabuddy/loaders/jira_loader.py` only reads manually-exported JSON/CSV files; see its `# TODO` marker for where the MCP/JQL integration plugs in once the connection + JQL are shared, per `qabuddy-ai-build-prompt.md` §4.
- **Figma integration** — `data/figma_designs/README.md` stub only, no loader, `source_type=figma_design` never populated.
- **Audio transcription** — `meeting_note_loader.py` assumes already-transcribed `.txt`/`.md` files.
- **Hourly auto-ingestion** — the systemd timer is installed by `deploy.sh` but not enabled by default (above); enabling it re-ingests everything unconditionally, not true change-detection.
- **Test-case "generate a new test case" mode** — `/chat` answers grounded questions only; authoring is out of scope for phase 1.

A browser upload UI **is** built (not on this list): the Sources page in
`frontend/` lets you upload files straight into a source's `data/`
folder — see the Frontend section in `README.md`. `POST
/api/sources/{source_type}/upload` is the endpoint behind it.

---

See `qabuddy-ai-build-prompt.md` for the formal build spec this
architecture answers (embedding model / vector DB / chunk size-overlap
justification, folder structure, phase 1 vs. phase 2 scope) and
`prompt.md` for the original informal requirements brain-dump they were
both derived from.
