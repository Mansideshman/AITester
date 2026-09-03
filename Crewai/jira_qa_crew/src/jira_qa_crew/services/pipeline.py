"""Ticket parsing + the top-level run orchestrator.

`run_pipeline` isolates each ticket completely: a fresh gateway, fresh
agents, fresh tasks, fresh tracker per ticket (see crew/factory.py), and one
ticket failing never stops the rest (continue-on-error), matching the
"process every valid ticket independently" requirement.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime
from pathlib import Path

from ..config import Settings
from ..exceptions import JiraFetchError, PipelineStageError, TicketValidationError
from ..jira.gateway import JiraGateway
from ..models import RunSummary, TicketRunResult
from ..crew.factory import build_groq_llm, build_ticket_crew
from . import artifacts, traceability, validation

logger = logging.getLogger(__name__)

_SPLIT_PATTERN = re.compile(r"[,\n;]+|\s+")
_TICKET_PATTERN = re.compile(r"^[A-Z][A-Z0-9]*-\d+$")


def parse_ticket_input(raw: str) -> tuple[list[str], list[str]]:
    """Split/normalize/dedupe raw multi-line ticket input.

    Returns (valid_ticket_keys, invalid_tokens) -- invalid tokens are surfaced
    to the UI instead of silently dropped.
    """
    tokens = [t for t in _SPLIT_PATTERN.split(raw or "") if t]
    seen: set[str] = set()
    valid: list[str] = []
    invalid: list[str] = []
    for token in tokens:
        key = token.strip().upper()
        if not _TICKET_PATTERN.match(key):
            invalid.append(token)
            continue
        if key in seen:
            continue
        seen.add(key)
        valid.append(key)
    return valid, invalid


def run_ticket(
    config: Settings,
    ticket_key: str,
    llm,
    gateway: JiraGateway | None = None,
    on_progress=None,
) -> TicketRunResult:
    """Run the full 4-stage crew for one ticket, isolated from every other ticket."""
    started_at = datetime.utcnow()
    result = TicketRunResult(ticket_key=ticket_key, status="failed", started_at=started_at)

    crew, tracker = build_ticket_crew(config, ticket_key, llm, gateway=gateway)
    if on_progress:
        # Wrap start/complete/fail so the UI callback fires on every transition.
        for method_name in ("start", "complete", "fail"):
            original = getattr(tracker, method_name)

            def _wrapped(*args, __original=original, **kwargs):
                __original(*args, **kwargs)
                on_progress(tracker)

            setattr(tracker, method_name, _wrapped)

    tracker.start("jira_analyst")
    if on_progress:
        on_progress(tracker)

    last_error: Exception | None = None
    attempts = max(1, config.pipeline_max_retries)
    crew_output = None
    for attempt in range(1, attempts + 1):
        try:
            crew_output = crew.kickoff()
            last_error = None
            break
        except Exception as exc:  # noqa: BLE001 - any stage/tool/LLM failure must be caught and recorded
            last_error = exc
            logger.warning("run_ticket: %s attempt %d/%d failed: %s", ticket_key, attempt, attempts, exc)

    if last_error is not None or crew_output is None:
        result.errors.append(str(last_error) if last_error else "Pipeline produced no output.")
        result.completed_at = datetime.utcnow()
        if isinstance(last_error, JiraFetchError):
            result.errors[-1] = f"Jira fetch failed for both MCP and REST: {last_error}"
        return result

    try:
        ra, plan, suite, bundle = (t.pydantic for t in crew_output.tasks_output)
    except (ValueError, TypeError) as exc:
        raise PipelineStageError(ticket_key, "output_parsing", exc) from exc

    result.source = ra.source
    result.requirement_analysis = ra
    result.test_plan = plan
    result.test_case_suite = suite
    result.playwright_bundle = bundle

    warnings: list[str] = []
    warnings += validation.validate_requirement_analysis(ra)
    warnings += validation.validate_test_plan(plan, ra)
    warnings += validation.validate_test_case_suite(suite, ra)
    warnings += validation.validate_playwright_bundle(bundle, suite)
    result.warnings = warnings

    rows, coverage = traceability.build_traceability(ra, suite, bundle)
    result.traceability = rows
    result.coverage = coverage

    result.status = "completed_with_warnings" if warnings else "completed"
    result.completed_at = datetime.utcnow()
    return result


def render_and_write_ticket(output_dir: Path, run_id: str, result: TicketRunResult) -> Path | None:
    if not (result.requirement_analysis and result.test_plan and result.test_case_suite and result.playwright_bundle):
        return None

    ticket_dir = artifacts.write_ticket_artifacts(
        output_dir,
        run_id,
        result.ticket_key,
        requirement_analysis_json=result.requirement_analysis.model_dump_json(indent=2),
        test_plan_md=artifacts.render_test_plan_markdown(result.test_plan),
        test_cases_md=artifacts.render_test_cases_markdown(result.test_case_suite),
        test_cases_csv=artifacts.render_test_cases_csv(result.test_case_suite),
        traceability_csv=artifacts.render_traceability_csv(result.traceability),
        playwright_md=artifacts.render_playwright_markdown(result.playwright_bundle),
        playwright_files=result.playwright_bundle.files,
    )
    result.artifact_dir = str(ticket_dir)
    return ticket_dir


def run_pipeline(
    config: Settings,
    raw_ticket_input: str,
    on_ticket_progress=None,
) -> RunSummary:
    valid, invalid = parse_ticket_input(raw_ticket_input)
    if invalid:
        logger.warning("run_pipeline: ignoring invalid ticket token(s): %s", invalid)
    if not valid:
        raise TicketValidationError("No valid Jira ticket keys found in input.")
    if len(valid) > config.pipeline_max_tickets:
        raise TicketValidationError(
            f"{len(valid)} tickets given, exceeds PIPELINE_MAX_TICKETS={config.pipeline_max_tickets}."
        )

    run_id = f"RUN-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    summary = RunSummary(run_id=run_id, started_at=datetime.utcnow(), tickets=valid)

    llm = build_groq_llm(config)

    for ticket_key in valid:
        result = run_ticket(config, ticket_key, llm, on_progress=on_ticket_progress)
        render_and_write_ticket(Path(config.output_dir), run_id, result)
        summary.results.append(result)

    summary.completed_at = datetime.utcnow()
    artifacts.write_run_summary(Path(config.output_dir), summary)
    return summary
