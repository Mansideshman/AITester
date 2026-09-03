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
- **QA_Pipeline.md** — Build spec (RICE-POT prompt) for a planned **Jira QA Crew**
  Streamlit app: a 4-agent CrewAI pipeline (Jira Analyst → Test Plan Writer → Test Case
  Writer → Playwright Coder) that turns Jira ticket IDs into a full QA artifact pack
  (test plan, test cases, traceability matrix, Playwright TypeScript tests), with Jira MCP
  as primary access and Jira REST API as fallback. Not yet implemented.

## Status

Early-stage / exploratory. `testanalystagent.py` and `research_write_AI_agents.py` are
working examples; the bug-triage crew and Jira QA Crew app are in progress.
