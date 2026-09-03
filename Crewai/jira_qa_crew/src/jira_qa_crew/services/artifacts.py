"""Deterministic renderers: Pydantic objects -> markdown/CSV/TypeScript files.

Nothing here calls an LLM. Artifact paths are always built from a sanitized
ticket key and fixed filenames -- ticket input can never influence a path
outside `outputs/<run_id>/<ticket_key>/`.
"""

from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from pathlib import Path

from .. import models as _m
from ..exceptions import ArtifactError
from ..models import PlaywrightBundle, RunSummary, TestCaseSuite, TestPlan, TraceRow

_SAFE_SEGMENT = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_path_segment(segment: str) -> str:
    """Collapse anything that isn't alnum/dot/dash/underscore, and refuse '..'."""
    cleaned = _SAFE_SEGMENT.sub("-", segment).strip("-.")
    if not cleaned or cleaned in {".", ".."}:
        raise ArtifactError(f"Refusing to build a path from unsafe segment: {segment!r}")
    return cleaned


def render_test_plan_markdown(plan: TestPlan) -> str:
    lines = [f"# Test Plan: {plan.ticket_key}\n"]
    for slug in _m.TEST_PLAN_SECTIONS:
        title = _m.TEST_PLAN_SECTION_TITLES[slug]
        body = (plan.sections.get(slug) or "_Not provided._").strip()
        lines.append(f"## {title}\n\n{body}\n")

    if plan.scenarios:
        lines.append("## Scenario -> Requirement Traceability\n")
        for scenario in plan.scenarios:
            refs = ", ".join(scenario.requirement_refs) or "—"
            lines.append(f"- **{scenario.id}** ({refs}): {scenario.description}")

    return "\n".join(lines).strip() + "\n"


def render_test_cases_markdown(suite: TestCaseSuite) -> str:
    lines = [f"# Test Cases: {suite.ticket_key}\n"]
    for case in suite.test_cases:
        lines.append(f"## {case.id} — {case.title}\n")
        lines.append(f"- **Priority**: {case.priority}  ")
        lines.append(f"- **Type**: {case.test_type}  ")
        lines.append(f"- **Requirements**: {', '.join(case.requirement_refs) or '—'}  ")
        lines.append(f"- **Acceptance Criteria**: {', '.join(case.acceptance_criteria_refs) or '—'}  ")
        lines.append(f"- **Automation**: {case.automation_candidate} — {case.automation_rationale}  ")
        lines.append(f"\n**Objective**: {case.objective}\n")
        if case.preconditions:
            lines.append("**Preconditions**:")
            lines.extend(f"- {p}" for p in case.preconditions)
        if case.test_data:
            lines.append(f"\n**Test Data**: {case.test_data}\n")
        lines.append("**Steps**:")
        lines.extend(f"{i + 1}. {step}" for i, step in enumerate(case.steps))
        lines.append(f"\n**Expected Result**: {case.expected_result}\n")
        if case.tags:
            lines.append(f"**Tags**: {', '.join(case.tags)}\n")
        if case.assumptions_or_blockers:
            lines.append(f"**Assumptions/Blockers**: {case.assumptions_or_blockers}\n")
    return "\n".join(lines).strip() + "\n"


def render_test_cases_csv(suite: TestCaseSuite) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "ticket_key",
            "title",
            "priority",
            "test_type",
            "requirement_refs",
            "acceptance_criteria_refs",
            "preconditions",
            "test_data",
            "steps",
            "expected_result",
            "automation_candidate",
            "automation_rationale",
            "tags",
            "assumptions_or_blockers",
        ]
    )
    for case in suite.test_cases:
        writer.writerow(
            [
                case.id,
                case.ticket_key,
                case.title,
                case.priority,
                case.test_type,
                "; ".join(case.requirement_refs),
                "; ".join(case.acceptance_criteria_refs),
                "; ".join(case.preconditions),
                case.test_data,
                " | ".join(case.steps),
                case.expected_result,
                case.automation_candidate,
                case.automation_rationale,
                "; ".join(case.tags),
                case.assumptions_or_blockers,
            ]
        )
    return buffer.getvalue()


def render_traceability_csv(rows: list[TraceRow]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["requirement_id", "acceptance_criterion_id", "test_case_ids", "automated_test_ids", "coverage_status", "reason"]
    )
    for row in rows:
        writer.writerow(
            [
                row.requirement_id,
                row.acceptance_criterion_id or "",
                "; ".join(row.test_case_ids),
                "; ".join(row.automated_test_ids),
                row.coverage_status,
                row.reason,
            ]
        )
    return buffer.getvalue()


def render_playwright_markdown(bundle: PlaywrightBundle) -> str:
    lines = [
        f"# Playwright Automation: {bundle.ticket_key}\n",
        f"**Readiness**: {bundle.readiness}\n",
        f"**Automated test cases**: {', '.join(bundle.automated_test_case_ids) or 'none'}\n",
    ]
    if bundle.notes:
        lines.append(f"**Notes**: {bundle.notes}\n")
    for file in bundle.files:
        lines.append(f"## `{file.path}`\n")
        lines.append("```typescript")
        lines.append(file.content.rstrip())
        lines.append("```\n")
    return "\n".join(lines).strip() + "\n"


def write_ticket_artifacts(
    output_dir: Path,
    run_id: str,
    ticket_key: str,
    *,
    requirement_analysis_json: str,
    test_plan_md: str,
    test_cases_md: str,
    test_cases_csv: str,
    traceability_csv: str,
    playwright_md: str,
    playwright_files: list,
) -> Path:
    safe_run_id = sanitize_path_segment(run_id)
    safe_ticket = sanitize_path_segment(ticket_key)
    ticket_dir = Path(output_dir) / safe_run_id / safe_ticket
    ticket_dir.mkdir(parents=True, exist_ok=True)

    (ticket_dir / "requirements_analysis.json").write_text(requirement_analysis_json)
    (ticket_dir / "test_plan.md").write_text(test_plan_md)
    (ticket_dir / "test_cases.md").write_text(test_cases_md)
    (ticket_dir / "test_cases.csv").write_text(test_cases_csv)
    (ticket_dir / "traceability_matrix.csv").write_text(traceability_csv)
    (ticket_dir / "playwright_tests.md").write_text(playwright_md)

    playwright_dir = ticket_dir / "playwright" / "tests"
    playwright_dir.mkdir(parents=True, exist_ok=True)
    for file in playwright_files:
        rel = file.path.lstrip("/\\")
        safe_parts = [sanitize_path_segment(part) for part in Path(rel).parts]
        dest = ticket_dir / "playwright" / Path(*safe_parts)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(file.content)

    return ticket_dir


def write_run_summary(output_dir: Path, run_summary: RunSummary) -> Path:
    safe_run_id = sanitize_path_segment(run_summary.run_id)
    run_dir = Path(output_dir) / safe_run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    manifest = json.loads(run_summary.model_dump_json())
    (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, default=str))

    lines = [
        f"# Run {run_summary.run_id}",
        f"Tickets: {len(run_summary.tickets)}",
        f"Completed: {run_summary.completed}",
        f"Completed with warnings: {run_summary.completed_with_warnings}",
        f"Failed: {run_summary.failed}",
        "",
    ]
    for result in run_summary.results:
        lines.append(f"- **{result.ticket_key}** — {result.status} (source: {result.source or 'n/a'})")
    (run_dir / "run_summary.md").write_text("\n".join(lines) + "\n")

    return run_dir


def build_run_zip(run_dir: Path) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in Path(run_dir).rglob("*"):
            if path.is_file():
                zf.write(path, arcname=path.relative_to(run_dir))
    return buffer.getvalue()
