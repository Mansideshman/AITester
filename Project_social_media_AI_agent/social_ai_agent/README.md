# ContentForge

An automated AI content-generation pipeline with a local web dashboard.
Generates LinkedIn posts, Medium articles, Instagram scripts, YouTube scripts, Dev.to articles,
and matching images — all saved to a local Excel file and served through a Next.js UI.

## Requirements

- **Node.js 18+** (Next.js 14 will fail to start on older Node versions, e.g. Node 10/12, with a syntax error)

## Stack

- **Next.js 14** (App Router) + React + Tailwind CSS
- **Groq** (llama-3.3-70b-versatile) — text generation
- **Gemini 2.0 Flash** (gemini-2.0-flash-preview-image-generation) — image generation
- **ExcelJS** — read/write `content_calendar.xlsx`
- **node-cron** — daily 09:00 trigger

## Setup

### 1. Install dependencies

```bash
cd social_ai_agent
npm install
```

### 2. Add API keys

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
GROQ_API_KEY=gsk_your_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The Next.js instrumentation hook (`instrumentation.ts`) registers the daily
09:00 cron automatically on server start — no separate process needed.

## Where things land

| Artifact | Location |
|---|---|
| Excel calendar | `./content_calendar.xlsx` (project root) |
| Generated images | `./public/images/` (served at `/images/...`) |
| Environment keys | `.env.local` (never committed) |

## Manual trigger

Click **Run Pipeline Now** in the dashboard, or:

```bash
curl -X POST http://localhost:3000/api/run
```

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/run` | POST | Trigger the full pipeline |
| `/api/today` | GET | Today's content row as JSON |
| `/api/calendar` | GET | All rows (newest first) |
| `/api/status` | GET | Pipeline state + API key health |
| `/api/download` | GET | Download `content_calendar.xlsx` |

## Agents

| Agent | Model | What it does |
|---|---|---|
| Agent 1 — Topic Generator | Groq | Picks a fresh topic from the keyword pool, appends row |
| Agent 2 — Content Writer | Groq | Writes 5 content pieces for today's topic |
| Agent 3 — Image Generator | Gemini | Generates 3 images (Medium cover, LinkedIn, IG) |
| Agent 4 — Sheet Updater | (built-in) | Each agent writes to Excel via `ExcelManager` with a mutex |

## Pipeline

```
runPipeline()
  └─ Agent1 → writes topic, Status=Pending
  └─ Agent2 → writes 5 content pieces, Status=Imaging
  └─ Agent3 → generates 3 images, Status=Done (or Error)
```

The cron fires daily at 09:00 local time. Each step updates `Status` in the
Excel file so the dashboard reflects progress live.
