# JobHunt Copilot

Built from `JobHunt_Copilot_MasterPrompt.md`. One dashboard that fetches jobs, scores
them against Mansi's profile, tailors a resume + drafts a cover letter/cold email per
job, and tracks every application through a Kanban pipeline. **Nothing ever auto-applies
— the app only opens the original posting; you click Apply yourself.**

## Stack

- `backend/` — Express + TypeScript + Prisma (SQLite locally). Holds `APIFY_TOKEN` and
  `ANTHROPIC_API_KEY` server-side only; the browser never sees them. (The master prompt
  allows Express as an alternative to Vercel functions — each route in `src/routes/` is a
  thin handler that would port to a `/api/*.ts` Vercel function with minimal changes.)
- `frontend/` — Vite + React + TypeScript + Tailwind v4, TanStack Query, React Router,
  `@dnd-kit` for the Kanban drag-and-drop, `docx` for resume export.

## Mock mode (default)

Without any fetch key / `ANTHROPIC_API_KEY` set, every screen works end-to-end against
realistic mock data:

- **Fetch** returns a fixed set of mock LinkedIn/Indeed-shaped postings (see
  `backend/src/services/mockJobs.ts`) instead of calling a real source.
- **Score / Tailor / Draft** use deterministic heuristic logic (see
  `backend/src/services/scoring.ts`, `tailor.ts`, `draft.ts`) instead of calling
  Anthropic.

Add real keys to `backend/.env` (see `.env.example`) to switch each piece to live calls —
no code changes needed. Settings screen shows "configured" / "not configured" for each,
never the key value.

## Fetch source priority: JSearch (free) → Apify (paid) → mock

`runFetch()` in `backend/src/services/fetchJobs.ts` picks the first of these that's
configured:

1. **`JSEARCH_API_KEY`** — JSearch (via RapidAPI) aggregates postings from many
   publishers (LinkedIn, Indeed, Glassdoor, ZipRecruiter, ...) through one free-tier
   query. **$0 cost within the free monthly quota** — sign up at rapidapi.com, subscribe
   to "JSearch" (publisher: letscrape) on its Basic/free plan, and paste the key. This is
   the recommended default; it replaced the paid Apify path once available. **Verified
   working end-to-end 2026-08-09**, including a real, clickable `linkedin.com` apply link
   saved through the full app pipeline at $0 cost.
2. **`APIFY_TOKEN`** — per-source paid actors (below), used only if JSearch isn't
   configured.
3. Neither configured → mock data.

### Three fetch actions (Search & Fetch page)

- **Fetch LinkedIn** / **Fetch Indeed** — `fetchViaJSearch()` runs one query and keeps
  only items whose `job_publisher` matches that name. Same behavior as before.
- **Fetch All Sources** — same one query, but keeps *every* publisher returned (each
  `Job.source` is set to that item's own `job_publisher`, lowercased) instead of
  discarding anything that isn't LinkedIn/Indeed. This is the actual "expand to worldwide
  sources" mechanism: JSearch/Google-for-Jobs already indexes far more than two boards
  (Glassdoor, ZipRecruiter, SimplyHired, Shine, Jobrapido, individual companies' own
  career pages, ...) — the old code was just throwing all of that away. Verified
  2026-08-09: one `/all` fetch returned real jobs from `linkedin`, `indeed`, `shine`,
  `simplyhired`, `hitachi careers`, and `jobrapido.com` in a single $0 call.
- `GET /api/jobs/sources` returns the distinct `source` values actually present, so the
  Jobs screen's source filter is dynamic (not a hardcoded linkedin/indeed dropdown).
- **Location rotation**: every JSearch-backed fetch (any of the three actions) round-
  robins through `SearchConfig.locations` via `SearchConfig.lastLocationIndex`, instead
  of always querying `locations[0]`. Each individual query is still narrow (one keyword +
  one location, ~1 request), keeping worldwide coverage affordable on the free quota —
  full rotation through all 6 configured locations takes 6 fetches to cycle once.

### JSearch integration notes (found the hard way, 2026-08-09)

- **The classic `/search` endpoint returns `404 "Endpoint '/search' does not exist"`** on
  current RapidAPI subscriptions — even with a valid, subscribed key (confirmed by the
  same key successfully calling `/job-details` and `/estimated-salary`). The live
  endpoint is **`/search-v2`** (cursor-paginated). `lib/jsearch.ts` calls that.
- `/search-v2`'s response shape differs from the classic `/search` docs: results are at
  `data.jobs` (an array), with `data.cursor` alongside for pagination — not `data`
  directly.
- There's no `job_salary_currency` field; use the ready-made `job_salary_string` (e.g.
  `"176K–227K a year"`) instead of reconstructing one from min/max/period.
- **`remote_jobs_only=true` is silently ignored** by `/search-v2` (doesn't appear in the
  echoed `parameters`, and non-remote jobs still come back) — don't rely on it; filter/
  infer remoteness client-side instead (already done via `inferWorkType`).
- **The `query` param is natural-language, not boolean search** — a compound
  `"X OR Y OR Z jobs in Location"` string (joining multiple target titles) returned
  **zero** results, while a single plain `"X jobs in Location"` phrase with the exact
  same filters returned 10. `buildJSearchQuery()` uses only the first/top keyword now.
- **A `date_posted=today` (24h) window plus a narrow/niche title (e.g. "AI QA Engineer")
  legitimately returns 0 results** most of the time — this is real data sparsity, not a
  bug. `date_posted=week` reliably returns results for the same query. If "Run now"
  keeps coming back empty, check `SearchConfig.datePosted` before assuming something's
  broken.
- Getting a working key took three attempts: an `ak_`-prefixed key (wrong service/format
  entirely, 403), a 64-char hex key (valid-looking but returned "You are not subscribed
  to this API" — account existed but hadn't clicked Subscribe on JSearch's own page), and
  finally a proper RapidAPI-format key (contains `msh`/`jsn` infixes) — which is the
  format to look for if a user reports auth trouble.

## Apify (paid fallback) — verified working, real quirks

**Live mode is verified working** (tested 2026-08-08 against real Apify actors with a
real token): a real LinkedIn fetch pulled 720 postings, correctly scored/saved 326 of
them, all with genuine, clickable `linkedin.com` posting URLs. Two real-actor quirks
worth knowing if you touch `fetchJobs.ts`:

- **The LinkedIn actor (`cheap_scraper/linkedin-job-scraper`) refuses to return any
  results below a ~150-result budget floor** (~$0.13+ depending on account tier) — a run
  under that floor "succeeds" but silently returns zero jobs, only charging the ~$0.02
  startup cost. `SearchConfig.spendCapUsd` needs to comfortably clear that floor (raised
  to `$2` in the seed after hitting this) or every run wastes its startup charge for
  nothing.
- **The actor's own output field also named `workType` is the job's *function/category*
  (e.g. `"Engineering"`), not remote/hybrid/onsite** — there's no dedicated remoteness
  field in the dataset at all. `normalizeItem`'s `inferWorkType()` detects it from the JD
  text instead (falls back to whatever `SearchConfig.workType` was searched for).
  Likewise use `jobId` (not `jobUrl`) as the external ID, and `publishedAt` (ISO) instead
  of the human string `postedTime` (e.g. `"10 hours ago"`) for the stored posted-date.

The Indeed actor (`misceres/indeed-scraper`) has been field-checked against its real
input schema (`maxItemsPerSearch`, not `maxItems`) but not yet run for real — verify its
output shape the same way (`backend/scripts/reprocess-dataset.ts` can replay an
already-fetched, already-paid-for dataset through the mapping/scoring pipeline for free
if a field turns out wrong, no need to re-run the paid actor).

## Run locally

Requires Node 18+ (system Node on this machine is v10 — use `nvm use 20`).

```bash
# backend
cd backend
npm install
npx prisma migrate dev   # creates dev.db
npm run seed              # seeds Profile + SearchConfig from the master prompt
npm run dev                # http://localhost:8420

# frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173, proxies /api -> :8420
```

## Deploying (VPS, single process)

See `deploy/README.md` for the full guide. In short: `backend/src/index.ts`
auto-serves the built `frontend/dist` alongside the API when it's present, so
production is **one Node process, one URL** — no separate frontend host
needed. `deploy/deploy.sh` sets this up on a fresh Ubuntu VPS via systemd +
nginx (same pattern as `project9_QABuddyAI/deploy/`), with the SQLite database
kept outside the git checkout so redeploys never touch real data.

## What's implemented vs. the master prompt's Build Order

1. ✅ Scaffold (Vite+TS+Tailwind, router, app shell)
2. ✅ Prisma schema + seeded Profile
3. ✅ `/api/*` routes, wired to TanStack Query
4. ✅ Apify LinkedIn fetch (real, gated by env) + spend cap + RunLog + mock fallback
5. ✅ Scoring service + ranked Jobs screen with badges/flags
6. ✅ Job Detail + tailor/cover/email + .docx/.txt export
7. ✅ Kanban tracker + dedupe (Company+Role) + CSV export
8. ✅ Dashboard summary + run history/cost
9. ✅ Indeed source (mock + real path); polish; deployed (VPS via `deploy/`, not Vercel —
   Express serves the built frontend itself, see "Deploying" above). **Not done:** the
   optional one-way Google Sheets sync mentioned in the spec (CSV export covers the same
   need locally).

## Hard rules preserved

- Apply action only opens `applyUrl` in a new tab and lets you record it — never submits
  anything.
- Spend cap is enforced server-side (`fetchJobs.ts` checks this month's `RunLog` spend
  against `SearchConfig.spendCapUsd` before every run).
- Jobs dedupe by `(source, externalId)`; Applications dedupe by `(company, title)` and
  are never overwritten backward once further along the pipeline.
- Tailoring/drafting prompts instruct the model to use only the resume's real experience
  and preserve the five verified metrics verbatim.
