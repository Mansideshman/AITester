# MASTER BUILD PROMPT — "JobHunt Copilot" (React web app)

Paste this whole file into your vibe-coding tool (Claude Code, Cursor, Bolt.new,
Lovable, or v0). It builds a production-ready app that automates my job search
end-to-end **except the final apply click**, which stays human.

---

## 0. YOUR ROLE
You are a senior full-stack engineer with 20+ years' experience. Build a clean,
typed, production-ready web app called **JobHunt Copilot**. Work incrementally,
commit after each milestone (see Build Order), and keep the human in the loop.
Do not auto-apply to anything, ever.

## 1. PRODUCT GOAL
One dashboard that (a) fetches fresh jobs from Apify LinkedIn + Indeed, (b) scores
each against my resume, (c) lets me tailor my resume + generate a cover letter +
cold email per job with one click, and (d) tracks every application through a
Kanban pipeline. I review and click apply myself.

## 2. MY PROFILE (seed this into the app's Profile store)
- Name: Mansi Deshman. Base: Pune, India.
- Role identity: AI QA Engineer — LLM Testing & Evaluation, Agentic AI Quality.
  ~4 yrs total experience.Now interested in applying for Agentic AI Engineer/Gen AI Engineer
  AI automation workflow engineer/AI first job by reducing software engineering role.
- Flagship project: Qualia — production 11-agent AI QA platform (qualiaqa.vercel.app).
- Verified metrics (MUST be preserved verbatim in any tailored resume; never inflate):
  70% regression-time reduction · 90% test coverage · 60% faster releases ·
  zero released regressions · 100% audit readiness.
- Core stack she can honestly claim: Python, Playwright, Selenium (Java), REST API
  testing, RAGAS, RAG pipeline testing, LangChain/CrewAI/n8n/Langflow, CI/CD gates,
  hallucination/eval/prompt testing. Certs: ADISA, NIST 800-88.

MY CONSTRAINTS (drive FETCH + SCORE):
- Open to remote/hybrid in Pune,India AND global remote opprtunity outside pune city and out of India as well
- Full-time, permanent only. Target >= 20 LPA (or global equivalent).
- Time zone: prefer near-IST (UTC+5:30). Full marks = Gulf/ME (UTC+3-4), Europe/UK
  (UTC 0..+2), Singapore/APAC (UTC+8). US/Canada/LATAM = partial, flag "small overlap".
- Flag any role needing in-country work authorization / no visa sponsorship.

## 3. TECH STACK
- Frontend: React + Vite + TypeScript, TailwindCSS, shadcn/ui, lucide-react,
  TanStack Query (server state), React Router, Zustand (light UI state).
- Backend: Vercel serverless functions (`/api/*`) — REQUIRED to hold secrets and
  proxy all third-party calls. (Express is an acceptable alternative.)
- Storage: Supabase (Postgres) via Prisma, or SQLite+Prisma for local. Optional
  one-way sync to a Google Sheet for the tracker.
- Deploy: Vercel.

## 4. SECRETS & SECURITY (critical, non-negotiable)
- APIFY_TOKEN and ANTHROPIC_API_KEY live in server env vars ONLY.
- The browser calls my own `/api/*` routes; those routes call Apify/Anthropic.
- No third-party key ever reaches client code or the network tab.

## 5. DATA MODEL (Prisma-style)
- Profile: name, base, constraints(json), targetTitles[], verifiedMetrics[], resumeText.
- SearchConfig: keywords[], locations[], workType[], datePosted(enum r86400/r604800),
  jobType[], spendCapUsd.
- Job: id, externalId, source, title, company, location, workType, postedTime,
  jdUrl, applyUrl, jdText, estPay, tzOverlap(enum: full/partial/none),
  fitScore(int), fitReasons[], flags[] (workAuth, skillGap, salaryUnknown), createdAt.
- ResumeVersion: id, jobId, summary, skills[], bullets[], atsText, diff[], createdAt.
- Draft: id, jobId, type(coverLetter|coldEmail), body, createdAt.
- Application: id, jobId, status(enum), appliedDate, resumeVersionId,
  coverLetterSent(bool), coldEmailSent(bool), recruiter, nextAction, nextActionDate,
  notes, timeZone. Unique(company, title) to prevent duplicates.
- RunLog: id, source, itemsFetched, costUsd, createdAt.

## 6. EXTERNAL INTEGRATIONS (server routes)
- `POST /api/fetch/linkedin` → runs Apify actor `cheap_scraper/linkedin-job-scraper`
  with input built from SearchConfig:
  { keyword: targetTitles, locations, workType, publishedAt: datePosted,
    jobType: ["full-time"], saveOnlyUniqueItems: true }
  Enforce callOptions.maxTotalChargeUsd = SearchConfig.spendCapUsd. Poll run,
  fetch dataset items (fields: jobTitle, companyName, location, postedTime,
  applyUrl, jobUrl, jobDescription, experienceLevel, salaryInfo), map → Job, dedupe
  by externalId, write a RunLog with cost.
- `POST /api/fetch/indeed` → same shape via an Indeed actor/API (IN + US-remote +
  "remote worldwide").
- `POST /api/ai` → Anthropic Messages API (model: claude-sonnet or opus). Used for
  SCORE, TAILOR, DRAFT. Always request strict JSON; parse safely.

## 7. CORE ENGINE — the copilot pipeline (implement each step as a feature)
FETCH → Search runner (§6). SCORE → §9. RANK → Jobs list (§8.3).
TAILOR → §10. DRAFT → §10. TRACK → §8.5 Kanban. The canonical pipeline text is in
the Appendix — treat it as the source of truth for behavior.

## 8. UI SCREENS
1. **Dashboard** — funnel summary (counts per status from the Kanban), today's new
   matches, and spend-this-month vs cap.
2. **Search & Fetch** — edit SearchConfig (keywords, locations multiselect, workType,
   date window, spend cap). "Run now" button. Run history table with items + cost.
3. **Jobs** — ranked cards: title, company, posted-ago, TZ-overlap badge (green/amber/
   grey), fit% ring, flag chips (work-auth, skill-gap, salary?). Filters by TZ, fit,
   source, flag. Actions: Save / Dismiss / Open detail.
4. **Job Detail** — full JD; three one-click panels:
   - *Tailor Resume* → returns ATS-plain summary+skills+top-5 bullets + a visible
     diff of what changed; download as .docx and .txt.
   - *Cover Letter* (<150 words) and *Cold Email* (<120 words), JD-specific.
   - *Mark Applied* → creates/updates Application, flips status, records which
     resume version + whether letter/email were sent.
5. **Tracker (Kanban)** — columns Saved → Applied → Screening → Interview → Offer →
   Rejected. Drag to move. Inline-edit fields. Dedupe by Company+Role. Export CSV /
   push to Google Sheet.
6. **Settings** — profile + resume upload/parse, model choice, spend cap. Keys are
   env-only (show status "configured", never the value).

## 9. SCORING RUBRIC (0-100, implement server-side in /api/ai)
Weighted sum, return score + short reasons + flags:
- Title/keyword match to my target titles ...... 25
- Agentic / LLM / eval / RAG overlap ........... 25
- Seniority fit (~5 yrs; penalize Staff/Principal/Director) ... 15
- Remote-friendly ............................... 10
- Likely >= 20 LPA / global equivalent ......... 10
- IST time-zone overlap (full=15, partial/US=7, none=0) ... 15
Drop anything < 60. Add flag "workAuth" if the post implies in-country right-to-work
or "no sponsorship". Add flag "skillGap" if it needs a skill/cert I can't honestly
demonstrate.

## 10. TAILORING & DRAFTING RULES (honesty guardrails — enforce in prompts)
- Use ONLY experience present in my resume. Never invent skills, tools, or certs.
- Preserve the verified metrics verbatim.
- Mirror the JD's real keywords where I genuinely match; do not keyword-stuff.
- ATS-plain output (no tables/columns/graphics). Always show a change diff.
- Cover letter < 150 words; cold email < 120 words; specific to the JD and company.

## 11. HARD RULES
- NEVER auto-apply. The "Apply" action only opens applyUrl and marks status.
- Spend cap enforced server-side; show remaining budget; block runs over cap.
- Dedupe jobs by externalId and by Company+Role. Never lose tracker data.
- Graceful loading / empty / error states everywhere. Cache fetches; rate-limit runs.

## 12. BUILD ORDER (commit after each)
1. Scaffold Vite+TS+Tailwind+shadcn, router, app shell.
2. Prisma schema + storage + seed my Profile.
3. `/api/*` routes returning mocked data; wire frontend with TanStack Query.
4. Real Apify LinkedIn fetch + mapping + spend cap + RunLog.
5. Scoring service + ranked Jobs screen with badges/flags.
6. Job Detail + Anthropic tailor/cover/email + .docx export.
7. Kanban tracker + dedupe + CSV/Sheets export.
8. Dashboard summary + run history/cost.
9. Indeed source, polish, deploy to Vercel.

## 13. ACCEPTANCE CRITERIA
I can run a search, see ranked & scored jobs with TZ and work-auth flags, open one,
generate a tailored ATS resume + cover letter + cold email, mark it applied, and
watch it flow through the Kanban — with no key exposed in the browser and no
auto-applying anywhere.

---

## APPENDIX — Canonical copilot pipeline (behavioral source of truth)

ROLE: You are my AI job-hunt copilot. Run this pipeline and STOP for my review before drafting anything to send.

MY CONSTRAINTS:
- Base: Pune, India. Open to remote/hybrid in India AND global remote (outside India).
- Full-time, permanent only. Target >=20 LPA (or global equivalent).
- Time zone: prefer near-IST (UTC+5:30). Best overlap = Gulf/Middle East (UTC+3-4),
  Europe/UK (UTC 0 to +2), Singapore/APAC (UTC+8). US/Canada/LATAM OK too —
  small overlap / partial async is acceptable.

1. FETCH — Run Apify cheap_scraper/linkedin-job-scraper:
   { keyword: ["AI QA Engineer","AI Evaluation Engineer","Agentic AI Engineer",
     "AI Engineer LLM","LLM Application Engineer","AI Workflow Engineer"],
     locations: ["India","United Arab Emirates","United Kingdom","European Union",
       "Singapore","Germany"],
     workType: ["remote","hybrid"], publishedAt: "r86400",
     jobType: ["full-time"], saveOnlyUniqueItems: true }
   Also pull Indeed (IN + US-remote + "remote worldwide") for the same titles. Cap spend ~$0.25.

2. SCORE — Rate each job 0-100 vs my resume on: title match, agentic/LLM/eval
   overlap, seniority (~5 yrs), remote-friendly, likely >=20 LPA, AND time-zone
   fit with IST (Gulf/EU/APAC = full marks; US = partial, flag "small overlap").
   Drop <60. Flag any job needing a skill/cert I can't honestly demonstrate, and
   any that require in-country work authorization / no visa sponsorship.

3. RANK — Top 10 as a table: Title | Company | Posted | Level | Est.pay |
   TZ overlap | Fit% | Apply URL.

4. TAILOR (on my pick) — Rewrite my summary + skills + top 5 bullets to mirror
   that JD's keywords, using ONLY things I've actually done. Give ATS-plain text
   + a short list of what changed.

5. DRAFT — A <150-word cover letter and a <120-word cold email to the recruiter,
   specific to the JD.

6. TRACK — Log every job into my Job Tracker with columns: Date Added | Status |
   Company | Role/Title | Location | Work Type | Source | JD/Apply URL |
   Key JD Requirements | Est. Pay/LPA | Fit % | Resume Version Used |
   Cover Letter (Y/N) | Cold Email (Y/N) | Recruiter/Contact | Next Action |
   Next Action Date | Notes (incl. Time Zone). New finds = "Saved". On apply, flip
   to "Applied", set date, record resume version + letter/email sent. Never duplicate
   a Company+Role row.

RULES: Never auto-apply. Never invent skills/certs. Keep my verified metrics
(70% regression, 90% coverage, 60% faster releases, 100% audit). I apply myself.
