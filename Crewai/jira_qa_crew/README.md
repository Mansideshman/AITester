# Jira QA Crew

A CrewAI pipeline (Streamlit front end) that turns Jira ticket IDs into a full
QA artifact pack: requirements analysis, a 12-section test plan, traceable
test cases, and Playwright TypeScript automation -- with a requirements-to-tests
traceability matrix and downloadable artifacts. Built from the spec in
[`../QA_Pipeline.md`](../QA_Pipeline.md).

Core pipeline is implemented and tested; Docker/CI/full deployment docs are
deferred (see **Status** below).

## Architecture

```
Jira ticket IDs
   |
   v
Jira Analyst Agent        (fetch_jira_issue tool -> JiraGateway: MCP or REST)
   |  RequirementAnalysis
   v
Test Plan Writer Agent
   |  TestPlan
   v
Test Case Writer Agent
   |  TestCaseSuite
   v
Playwright Coder Agent
   |  PlaywrightBundle
   v
Deterministic validation + traceability (services/validation.py, traceability.py)
   |
   v
Artifact rendering (services/artifacts.py) -> outputs/<run_id>/<ticket_key>/...
   |
   v
Streamlit results + downloads (app.py, ui/)
```

Each stage's output is a validated Pydantic object (`output_pydantic` on the
CrewAI `Task`), passed as explicit `context` to the next stage. Markdown/CSV/
TypeScript files are rendered deterministically from those objects -- never
parsed back out of LLM prose. Coverage and traceability are plain Python,
not LLM-computed.

### Jira access: MCP primary, REST fallback

`JiraGateway` (`src/jira_qa_crew/jira/gateway.py`) is the one place that
decides where an issue comes from:

- `JIRA_INTEGRATION_MODE=auto` (default): try MCP, fall back to REST on any
  MCP failure, raise `JiraFetchError` only if both fail.
- `mode=mcp` / `mode=rest`: use only that provider.
- `DEMO_MODE=true`: use `fixtures/demo_tickets.json` instead of any live
  provider, and never as a silent fallback for a failed live call.

Only the Jira Analyst agent is given the `fetch_jira_issue` tool
(`src/jira_qa_crew/tools/jira_tool.py`) -- it's the only thing with Jira
access, and it's read-only by construction (no write/transition/delete path
exists anywhere in this codebase).

## Repository structure

```
app.py                          Streamlit entrypoint
src/jira_qa_crew/
  config.py                     Settings dataclass, loaded from env
  exceptions.py                 Typed exceptions
  models.py                     Pydantic schemas for every pipeline stage
  jira/
    adf.py                      Atlassian Document Format -> text
    base.py                     JiraProvider ABC + IssuePayload
    mcp_provider.py             MCP provider (crewai-tools MCPServerAdapter)
    rest_provider.py            REST v3 provider (requests)
    demo_provider.py            Fixture-backed provider for DEMO_MODE
    gateway.py                  auto/mcp/rest/demo decision logic
  tools/jira_tool.py            The only Jira-access CrewAI tool
  crew/
    agents.py, tasks.py         Build the 4 agents/tasks from prompts/*.yaml
    factory.py                  Fresh crew per ticket (Groq LLM + cache-key patch)
    callbacks.py                Stage-progress tracker for the Streamlit UI
  prompts/agents.yaml, tasks.yaml   Role/goal/backstory and task prompts
  services/
    pipeline.py                 Ticket parsing + run orchestration
    validation.py                Deterministic post-stage checks
    traceability.py             Requirement -> test case -> automation coverage
    artifacts.py                 Markdown/CSV/TS rendering + ZIP + path safety
  ui/                            Streamlit widgets (state, components, results)
fixtures/demo_tickets.json       Demo-mode Jira fixtures
tests/                           pytest suite (mocked LLM/Jira, no network)
scripts/smoke_test.py            Manual real-Groq/demo-Jira smoke test
```

## Setup

```bash
cd jira_qa_crew
pip install -r requirements.txt
cp .env.example .env   # fill in LLM_API_KEY at minimum
```

Every variable is documented in [`.env.example`](.env.example). Groq via
LiteLLM is what this was built and tested against (`LLM_MODEL` is the bare
Groq model name; the `groq/` LiteLLM prefix is added in code).

### Jira MCP setup

Set `JIRA_MCP_URL` (streamable HTTP) or `JIRA_MCP_COMMAND`/`JIRA_MCP_ARGS_JSON`
(stdio), and `JIRA_MCP_GET_ISSUE_TOOL` to your server's issue-fetch tool name
-- different Jira MCP servers name it differently
(`getJiraIssue`, `jira_get_issue`, ...); this project tries a small set of
common argument names (`issueKey`, `issue_key`, `key`, `ticket`, `id`) against
whatever tool name you configure. Requires `pip install 'crewai-tools[mcp]'`
(already in `requirements.txt`).

### Jira REST fallback setup

Set `JIRA_URL`, and either `JIRA_AUTH_MODE=basic` with `JIRA_EMAIL` +
`JIRA_API_TOKEN`, or `JIRA_AUTH_MODE=bearer` with `JIRA_BEARER_TOKEN`. Set
`JIRA_ACCEPTANCE_CRITERIA_FIELD` to your custom field id (e.g.
`customfield_10040`) if acceptance criteria live outside the description.

### Demo mode (no Jira credentials needed)

```bash
DEMO_MODE=true streamlit run app.py
```

Serves `VWO-48` / `VWO-49` from `fixtures/demo_tickets.json` instead of
calling Jira. Still calls the real LLM -- `LLM_API_KEY` must be set.

## Running

```bash
streamlit run app.py
```

Enter one or more ticket IDs (comma/space/newline/semicolon separated),
pick an integration mode, and click **Analyze & Generate QA Pack**. Each
ticket gets its own tab with Requirements Analysis / Test Plan / Test Cases
/ Playwright / Traceability / Run Details, and per-file or per-run (ZIP)
downloads.

## Tests

```bash
pytest -q
```

36 tests, no network or LLM calls: ticket parsing/normalization, ADF-to-text
conversion, MCP-success / MCP-failure-to-REST-fallback / REST-only / demo-mode
isolation / both-providers-failed gateway behavior, validation and
traceability/coverage logic, markdown/CSV/ZIP rendering and path-traversal
rejection, and full `run_pipeline`/`run_ticket` wiring with the CrewAI/LLM
layer mocked out.

For a real end-to-end check against the actual Groq API (uses demo Jira
fixtures, real LLM calls -- costs quota):

```bash
python scripts/smoke_test.py VWO-48
```

## Troubleshooting

- **`GroqException ... cache_breakpoint is unsupported`**: crewai marks
  messages with a `cache_breakpoint` key for providers with native prompt
  caching (Anthropic/OpenAI); its generic LiteLLM path never strips that key,
  and Groq rejects it. Already patched in `crew/factory.py` -- if you see
  this, something is constructing an `LLM`/`Crew` without going through
  `build_groq_llm`/`build_ticket_crew`.
- **`litellm.RateLimitError ... tokens per minute`**: Groq's free tier is
  8000 TPM, and one pipeline stage's system prompt + tool output can use
  ~2500 tokens, so back-to-back stages can trip it. `PIPELINE_MAX_RETRIES`
  gives one automatic retry; for heavier use, a paid Groq tier raises the
  TPM limit.
- **`sqlite3 >= 3.35.0` required (Chroma)**: crewai's memory layer needs a
  newer sqlite3 than most system Pythons ship. Already patched (swaps in
  `pysqlite3-binary`) at the top of `src/jira_qa_crew/__init__.py` -- must
  run before anything imports `crewai`, which is why it lives in the
  package `__init__`.
- **MCP always falls back to REST**: check `JIRA_MCP_GET_ISSUE_TOOL` matches
  your server's actual tool name, and that `crewai-tools[mcp]` is installed.

## Security notes

- The only Jira-touching code path is `FetchJiraIssueTool` -> `JiraGateway`
  -> a read-only GET; there is no write/transition/delete tool anywhere.
- Ticket input never reaches a filesystem path unsanitized --
  `artifacts.sanitize_path_segment` strips anything but
  `[A-Za-z0-9._-]` and rejects `.`/`..` before any `outputs/<run_id>/<ticket>/`
  directory or Playwright file path is built.
- Secrets (`LLM_API_KEY`, `JIRA_API_TOKEN`, `JIRA_BEARER_TOKEN`) are only
  ever read from environment/`.env`/`st.secrets`, never accepted through a
  UI text field, and never logged.
- Jira ticket content is treated as data passed to the LLM, not as
  instructions -- there is no code path that lets ticket text trigger a
  tool call, file write, or config change outside the fields it's asked to
  extract into.

## Status / limitations

Built and tested (36 passing tests + a real Groq smoke run): ticket parsing,
the Jira gateway and its MCP/REST/demo fallback logic, all 4 agents, output
validation, traceability/coverage, and artifact rendering + Streamlit UI.

Deferred from the original spec (a deliberate scope cut, not an oversight):

- Dockerfile / docker-compose.yml / Streamlit Community Cloud deployment docs.
- CI workflow (lint + test on push).
- `pyproject.toml`, `.streamlit/config.toml` theme file.
- The exhaustive test list in the original spec (auth-error paths, rate-limit
  handling, Streamlit `AppTest` UI tests, secret-redaction-in-logs tests) --
  the current suite covers the pipeline's decision logic, not every UI/error
  branch.
- The MCP provider is implemented against `crewai_tools.MCPServerAdapter`
  but has not been exercised against a real Jira MCP server (none was
  available in this environment) -- REST and demo-mode paths have been.
