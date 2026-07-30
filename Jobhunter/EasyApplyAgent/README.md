# Easy Apply Agent

A human-in-the-loop LinkedIn Easy Apply assistant. It logs in, searches for
jobs, fills out the Easy Apply form for each listing, and then **stops and
waits for your explicit confirmation before submitting anything**. It never
submits an application unattended.

## Before you use this

- Automated interaction with LinkedIn (bots, scripted logins, scripted
  applying) is against LinkedIn's User Agreement. Running this tool carries a
  real risk of your account being flagged or restricted. Use a low `--max`,
  keep the browser visible, and treat this as a form-filling assist, not a
  way to blast out hundreds of applications unattended.
- The agent never solves CAPTCHAs, 2FA, or security checkpoints — if LinkedIn
  shows one, you complete it yourself in the visible browser window.
- The agent never invents answers to screening questions. It only fills in
  answers you've explicitly pre-approved in `config/profile.json`. Anything
  else is left blank for you to fill in by hand before continuing.
- Submitting a low-quality or inaccurate application under your name is worse
  than not applying — glance at each form before you confirm submission.

## Setup

```bash
cd Jobhunter/EasyApplyAgent
npm install                       # also downloads a Chromium build for Playwright
cp .env.example .env               # fill in LINKEDIN_EMAIL / LINKEDIN_PASSWORD
cp config/profile.example.json config/profile.json   # fill in your search + answers
```

`config/profile.json` fields:

| Field | Purpose |
|---|---|
| `search.keywords` / `search.location` | LinkedIn job search query |
| `search.easyApplyOnly` | Adds the "Easy Apply only" filter |
| `resumePath` | Absolute path to the resume file to upload |
| `resumeLabel` | Short name recorded in the tracker export (e.g. `Resume_v2`) |
| `phone` | Autofills a phone number field if one is empty |
| `coverLetterDefault` | Autofills empty free-text/cover-letter boxes |
| `answers` | Exact question text → your true answer. Only exact matches you've pre-approved are ever filled in. |

`.env` and `config/profile.json` are gitignored — never commit them.

## Running it

```bash
npm start -- --max 5 --delay-min 6 --delay-max 14
```

Flags:

- `--max <n>` — stop after this many **submitted** applications (default 5).
- `--delay-min` / `--delay-max` — random pause in seconds between jobs, to
  avoid hammering LinkedIn (defaults 6–14s).
- `--dry-run` — fills out every form but always closes without submitting.
  Use this first to sanity-check the flow before letting it submit anything.
- `--headless` — run without a visible browser window. Not recommended: you
  won't be able to see or solve login checkpoints, and you lose the visual
  review step before each submission.

The first run opens a real, visible Chromium window and logs in with your
credentials. If LinkedIn shows a checkpoint, solve it in that window, then
press Enter in the terminal to continue. The session is then cached in
`.auth/` so you don't have to log in again next time (until it expires).

For every job that reaches its final "Submit application" step, the tool
pauses and prints the job title/company, then waits for one of:

- **Enter** — submit
- **`s`** — skip this job, don't submit
- **`q`** — stop the whole run immediately

## Syncing with JobTrackerAI

Every submitted application is appended to `output/applied-jobs.json` in the
same shape JobTrackerAI's tracker board uses. Open the tracker app and use
its **Import** button to pull those jobs onto your board — import now merges
by job id instead of replacing your existing board, so re-importing after
every run is safe.

## Known limitations

LinkedIn's markup changes often, and the selectors in `src/linkedin.ts` /
`src/applyFlow.ts` were written against a recent layout — they are not
guaranteed to match what you see today. When the agent can't find an
expected button, it stops and asks you to intervene manually rather than
guessing. If entire steps stop matching, expect to need to update the
selectors in those two files.
