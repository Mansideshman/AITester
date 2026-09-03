"""Deterministic requirement -> test case -> automation traceability.

Coverage is computed here in plain Python from the validated Pydantic
objects, never asked of the LLM -- satisfying "calculate coverage using
deterministic Python logic".
"""

from __future__ import annotations

from ..models import CoverageSummary, PlaywrightBundle, RequirementAnalysis, TestCaseSuite, TraceRow


def build_traceability(
    ra: RequirementAnalysis,
    suite: TestCaseSuite,
    bundle: PlaywrightBundle | None,
) -> tuple[list[TraceRow], CoverageSummary]:
    automated_ids = set(bundle.automated_test_case_ids) if bundle else set()

    cases_by_req: dict[str, list[str]] = {}
    for case in suite.test_cases:
        for ref in [*case.requirement_refs, *case.acceptance_criteria_refs]:
            cases_by_req.setdefault(ref, []).append(case.id)

    ac_by_req_hint: dict[str, str | None] = {}
    for ac in ra.acceptance_criteria:
        ac_by_req_hint[ac.id] = ac.id

    rows: list[TraceRow] = []
    all_ids = [item.id for item in ra.requirements] + [ac.id for ac in ra.acceptance_criteria]
    covered_count = 0

    for req_id in all_ids:
        case_ids = cases_by_req.get(req_id, [])
        automated = [cid for cid in case_ids if cid in automated_ids]

        if not case_ids:
            status, reason = "UNCOVERED", "No test case references this id."
        elif automated:
            status, reason = "COVERED", ""
            covered_count += 1
        else:
            status, reason = "PARTIAL", "Covered by manual test case(s) only; none automated."
            covered_count += 1

        rows.append(
            TraceRow(
                requirement_id=req_id,
                acceptance_criterion_id=ac_by_req_hint.get(req_id),
                test_case_ids=case_ids,
                automated_test_ids=automated,
                coverage_status=status,
                reason=reason,
            )
        )

    referenced_req_ids = set(cases_by_req.keys())
    orphan_requirements = [rid for rid in all_ids if rid not in referenced_req_ids]

    known_ids = set(all_ids)
    orphan_test_cases = [
        case.id
        for case in suite.test_cases
        if not (set(case.requirement_refs) | set(case.acceptance_criteria_refs)) & known_ids
    ]

    total = len(all_ids)
    coverage = CoverageSummary(
        total_requirements=total,
        covered_requirements=covered_count,
        orphan_requirements=orphan_requirements,
        orphan_test_cases=orphan_test_cases,
        coverage_percent=round((covered_count / total) * 100, 1) if total else 0.0,
    )

    return rows, coverage
