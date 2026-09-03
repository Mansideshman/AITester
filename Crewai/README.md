# Crewai

CrewAI multi-agent experiments running on Groq (via LiteLLM), used to prototype QA
automation agent crews before they graduate into standalone projects.

## Setup

```bash
cd Crewai
pip install -r requirements.txt
cp .env.example .env   # set GROQ_API_KEY, GROQ_MODEL, GROQ_BASE_URL
```

## Files

- **groq_llm.py** — Shared Groq LLM factory (`get_groq_llm`) used by every agent script
  in this folder. Patches `sqlite3` to `pysqlite3` before CrewAI imports it, and disables
  CrewAI's Anthropic/OpenAI-style prompt-cache breakpoint marker, which Groq's API rejects.
- **testanalystagent.py** — Sanity-check script: a single agent that writes a short test
  plan for a login form. Run directly to confirm the Groq + CrewAI setup works end to end.
- **research_write_AI_agents.py** — Two-agent sequential crew (researcher → writer) that
  researches common web-app bug categories and turns the findings into a bug-prevention
  checklist.
- **Build_QABugTriageCrewai.py** — In-progress 3-agent bug triage crew (triage → root
  cause → test recommendation) that will take a bug report/Jira ID and produce an RCA-style
  report. Agents and tasks are currently stubs (`Agent()`, `Task()`) — not yet runnable.
- **QABugTriageCreawai_prod.py** — Placeholder for the production version of the bug
  triage crew; not yet started.
- **QA_Pipeline.md** — Build spec (RICE-POT prompt) for **Jira QA Crew** (see below).
- **[jira_qa_crew/](jira_qa_crew/README.md)** — The built-out implementation of that spec:
  a 4-agent CrewAI pipeline (Jira Analyst → Test Plan Writer → Test Case Writer → Playwright
  Coder) behind a Streamlit UI, turning Jira ticket IDs into a requirements analysis,
  12-section test plan, traceable test cases, Playwright TypeScript automation, and a
  requirements-to-tests traceability matrix. Jira access goes through a gateway that tries
  MCP first and falls back to REST (or demo fixtures in `DEMO_MODE`), and every artifact is
  rendered deterministically from validated Pydantic objects — never parsed back out of LLM
  prose. 36 passing tests (gateway fallback, validation, traceability, rendering, full
  pipeline wiring, all with the LLM/Jira layer mocked) plus a real-Groq smoke script.

## Status

`testanalystagent.py` and `research_write_AI_agents.py` are working sanity-check examples;
`Build_QABugTriageCrewai.py` is still a stub. **jira_qa_crew/** is the one non-trivial build
here — core pipeline done and tested; Docker/CI/full deployment docs deliberately deferred
(see its own README's Status section).
