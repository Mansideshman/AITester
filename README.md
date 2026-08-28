# AITester Workspace

A portfolio of QA engineering and applied-AI projects: classic test automation frameworks
(Selenium, REST Assured, Playwright) alongside AI/LLM-powered tools that generate test
cases, run retrieval-augmented Q&A, drive multi-agent QA workflows, and automate parts of
the job-search process. Each project below is independently runnable — see its own README
for setup.

## AI Engineering & LLM-Powered Tools

- **[Qualia](https://github.com/Mansideshman/Qualia)** — Production-deployed, full-stack AI QA
  platform (React 18) with 9 tools spanning the QA lifecycle: JIRA→test-plan generation, test
  case generation, RICE-POT test strategy docs, release-readiness scoring, Vision-AI defect
  detection from screenshots, OpenAPI→test-suite generation, and Playwright/Cypress/Selenium
  code + framework scaffolding. Runs entirely client-side against GROQ's free-tier LLMs (Llama
  3.3 70B / Llama 4 Scout Vision) with automatic multi-model fallback, and pushes defects
  straight to Jira, Linear, GitHub, YouTrack, or Azure DevOps. No backend — credentials never
  leave the browser. Live at [qualiaqa.vercel.app](https://qualiaqa.vercel.app).
- **[project08_RAG/BasicRAG](project08_RAG/BasicRAG/README.md)** — A fully-visible
  Retrieval-Augmented Generation pipeline (FastAPI + React) built from scratch: drag-and-drop
  upload of PDF/TXT/MD/DOC/DOCX, local Nomic embeddings, ChromaDB vector storage, and Groq
  answer generation, with every pipeline stage (load → chunk → embed → retrieve → generate)
  visualized live in the UI as it runs. Like AdvancedRAG, swaps to a hosted embedding
  backend (Upstash Vector) when deployed, since Vercel's function size limit can't fit
  `torch`. Live at
  [basic-rag-explorer-five.vercel.app](https://basic-rag-explorer-five.vercel.app).
- **[project08_RAG/AdvancedRAG](project08_RAG/AdvancedRAG/README.md)** — A hybrid-retrieval
  upgrade to BasicRAG (Flask): dense+sparse embeddings, Reciprocal Rank Fusion, a
  cross-encoder reranker, and LLM query rewriting, all streamed live via SSE across
  upload/ingest/chunk-browser/chat pages. Runs on two backends picked automatically at
  runtime — `bge-m3` + Qdrant + `bge-reranker-v2-m3` locally, or Upstash Vector + Cohere
  Rerank when deployed, since Vercel's function size limit can't fit `torch` at all. Ships
  with a synthesized 5,000-row Jira-style VWO test case corpus and an animated HTML
  explainer of the architecture. Live at
  [advanced-rag-explorer.vercel.app](https://advanced-rag-explorer.vercel.app).
- **[project08_RAG/Langflow_RAG](project08_RAG/Langflow_RAG/README.md)** — Two exported
  Langflow visual RAG flows (baseline vs. an improved multi-branch chunking strategy) plus a
  500-row sample test-case dataset used to exercise them.
- **[project9_QABuddyAI](project9_QABuddyAI/README.md)** — A self-hosted, multi-source
  hybrid-RAG QA assistant: ask one question, get a cited answer grounded across a Selenium
  framework, a Playwright framework, a 5,000-row test-case repository, JIRA history, PRDs,
  meeting notes, and Jenkins CI logs. Reuses AdvancedRAG's `bge-m3` dense+sparse + Qdrant +
  cross-encoder-rerank core, re-architected for a VPS deployment (no Vercel size limits) with
  source-type-aware chunking — code, CSV rows, prose, and logs each chunked differently — and
  idempotent per-source ingestion. Ships with a React + TypeScript + shadcn/ui dashboard: a
  chat page with a live SSE-streamed rewrite→retrieve→rerank→generate pipeline, and a sources
  page with file-upload ingestion and per-source status.
- **[project_07_AI_Agents_LangFlow](project_07_AI_Agents_LangFlow/README.md)** — QA agents
  built on Langflow's low-code flow engine, each exposed as a REST endpoint and fronted by a
  React UI: a **Flaky Test Analyzer** that diffs two Playwright `results.json` runs and
  separates genuine flakiness from real regressions, and an **API Contract Validator** that
  checks a live endpoint's response against a JSON Schema via an OpenRouter-hosted DeepSeek
  model. Includes a documented fix for a real LangFlow persistence bug (SQLite DB silently
  resetting without an explicit `LANGFLOW_DATABASE_URL` override).
- **[project6_social_media_AI_agent/social_ai_agent](project6_social_media_AI_agent/social_ai_agent/README.md)**
  — ContentForge: an automated content-generation pipeline (Next.js 14) that turns one topic
  into a LinkedIn post, Medium article, Instagram/YouTube scripts, and matching AI-generated
  images (Groq Llama 3.3 for text, Gemini 2.0 Flash for images), all served through a local
  dashboard and logged to Excel.

## Test Automation Frameworks

- **[Project2_Selenium_framework](Project2_Selenium_framework/Advance_Selenium_Framework/README.md)** —
  Enterprise-style Selenium + Java + Maven + TestNG framework for CRM (Salesforce-style)
  applications: Page Object Model, driver lifecycle management, Log4j2 logging, automatic
  failure screenshots, plus built-in API (REST Assured) and database validation utilities —
  not just UI testing.
- **[Project3_RestAssuredAPIFramework](Project3_RestAssuredAPIFramework/README.md)** —
  Production-style REST Assured + TestNG API automation framework (Java) with POJO
  request/response models, custom assertion wrappers, JavaFaker test-data generation, and
  Allure reporting.
  ```bash
  cd Project3_RestAssuredAPIFramework
  mvn test
  ```
- **[Project4_PlaywrightAPIAutomationFramework](Project4_PlaywrightAPIAutomationFramework/README.md)**
  — Playwright-native API testing framework (TypeScript) using `APIRequestContext`, domain
  clients, and fixtures.
  ```bash
  cd Project4_PlaywrightAPIAutomationFramework
  npm install && npx playwright install
  npm run test:api
  ```

## QA Strategy & Prompt Engineering

- **[Project1_TC_Generator](Project1_TC_Generator)** — The RICE-POT prompt framework
  (Role, Instructions, Context, Example, Parameters, Output, Tone) for generating
  enterprise-grade, traceable functional and non-functional test cases from a PRD, with a
  worked example against the Restful-Booker API.
- **[templates](templates)** — Reusable QA reference material: prompt templates for test
  case, negative-test, security-test, and regression-suite generation, a JIRA/Xray/Zephyr
  field-mapping spec, an Anti-Hallucination Rules guide, and test strategy/plan/metrics
  templates used across the other projects in this workspace.

## AI Agent Tooling (Job Search Automation)

- **[Jobhunter/JobTrackerAI](Jobhunter/JobTrackerAI/README.md)** — Local-first job-application
  Kanban board (React 19, Vite, TypeScript, Tailwind v4, IndexedDB) tracking
  Wishlist→Applied→Follow-up→Interview→Offer, with JSON export/import and client-side
  fit/ATS scoring.
- **[Jobhunter/EasyApplyAgent](Jobhunter/EasyApplyAgent/README.md)** — Playwright + TypeScript
  CLI agent that automates LinkedIn's Easy Apply flow with explicit human-in-the-loop
  safeguards: it never invents screening-question answers and pauses for confirmation before
  every submission. Exports applied jobs in a schema JobTrackerAI can import directly.
- **[Resume_tailor](Resume_tailor)** — Claude Agent Skill definitions for resume tailoring
  (ATS gap analysis against a JD, ranked recommendations, no-fabrication rule) and a
  content-engine skill that turns one QA topic into a full multi-platform content pack in a
  consistent brand voice.

## Practice & Learning

- **[Python_LLMEvaluation](Python_LLMEvaluation/README.md)** — Python fundamentals practice
  and logic-building drills (logic scripts + sequential labs covering core Python through
  OOP and pytest), used as a hand-written baseline to evaluate LLM-generated Python
  solutions against.

## Contributing

- Add new projects under the workspace root and update this README.
- Follow existing project READMEs for setup and usage.
