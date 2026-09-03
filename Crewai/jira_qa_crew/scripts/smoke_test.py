"""Manual end-to-end smoke test: demo Jira fixture + real Groq LLM, one ticket.

Not part of the pytest suite (it costs a real LLM call and needs Groq creds).
Run: python scripts/smoke_test.py VWO-48
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
os.environ.setdefault("LLM_API_KEY", os.environ.get("GROQ_API_KEY", ""))
os.environ.setdefault("LLM_MODEL", os.environ.get("GROQ_MODEL", "").strip('"'))
os.environ.setdefault("LLM_TEMPERATURE", "0.1")
os.environ.setdefault("DEMO_MODE", "true")

from jira_qa_crew.config import load_config  # noqa: E402
from jira_qa_crew.crew.factory import build_groq_llm  # noqa: E402
from jira_qa_crew.services.pipeline import run_ticket  # noqa: E402

ticket_key = sys.argv[1] if len(sys.argv) > 1 else "VWO-48"

cfg = load_config()
cfg.require_llm()
llm = build_groq_llm(cfg)
result = run_ticket(cfg, ticket_key, llm)

print("STATUS:", result.status)
print("SOURCE:", result.source)
print("WARNINGS:", result.warnings)
print("ERRORS:", result.errors)
if result.requirement_analysis:
    ra = result.requirement_analysis
    print(f"REQS: {len(ra.requirements)}  ACs: {len(ra.acceptance_criteria)}")
if result.test_case_suite:
    print("TEST CASES:", len(result.test_case_suite.test_cases))
if result.playwright_bundle:
    print(f"PW FILES: {len(result.playwright_bundle.files)} readiness={result.playwright_bundle.readiness}")
if result.coverage:
    print(f"COVERAGE: {result.coverage.coverage_percent}%  orphan_reqs={result.coverage.orphan_requirements}")
