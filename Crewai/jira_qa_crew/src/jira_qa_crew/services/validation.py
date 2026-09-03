"""Deterministic post-stage validation -- never trust LLM markdown as fact.

Each `validate_*` function returns a plain list[str] of warnings (never
raises); the pipeline decides whether warnings downgrade a ticket to
"completed_with_warnings". Duplicate-ID and orphan checks run in
traceability.py since they need the full multi-stage picture.
"""

from __future__ import annotations

from ..models import RequirementAnalysis, TestCaseSuite, TestPlan
from .. import models as _m


def validate_requirement_analysis(ra: RequirementAnalysis) -> list[str]:
    warnings: list[str] = []
    if not ra.requirements:
        warnings.append("No requirements were extracted from the ticket.")
    if not ra.acceptance_criteria:
        warnings.append("No acceptance criteria were extracted from the ticket.")
    if not ra.summary:
        warnings.append("Ticket summary is empty.")

    seen_ids: set[str] = set()
    for item in [*ra.requirements, *ra.acceptance_criteria]:
        if item.id in seen_ids:
            warnings.append(f"Duplicate requirement/AC id: {item.id}")
        seen_ids.add(item.id)

    return warnings


def validate_test_plan(plan: TestPlan, ra: RequirementAnalysis) -> list[str]:
    warnings: list[str] = []

    missing_sections = [s for s in _m.TEST_PLAN_SECTIONS if not (plan.sections.get(s) or "").strip()]
    if missing_sections:
        titles = ", ".join(_m.TEST_PLAN_SECTION_TITLES[s] for s in missing_sections)
        warnings.append(f"Test plan is missing section(s): {titles}")

    if not plan.scenarios:
        warnings.append("Test plan has no high-level scenarios.")

    known_ids = {item.id for item in [*ra.requirements, *ra.acceptance_criteria]}
    for scenario in plan.scenarios:
        if not scenario.requirement_refs:
            warnings.append(f"Scenario {scenario.id} cites no REQ-*/AC-* id.")
            continue
        for ref in scenario.requirement_refs:
            if ref not in known_ids:
                warnings.append(f"Scenario {scenario.id} cites unknown id '{ref}'.")

    return warnings


def validate_test_case_suite(suite: TestCaseSuite, ra: RequirementAnalysis) -> list[str]:
    warnings: list[str] = []

    if not suite.test_cases:
        warnings.append("No test cases were generated.")

    known_ids = {item.id for item in [*ra.requirements, *ra.acceptance_criteria]}
    seen_case_ids: set[str] = set()
    for case in suite.test_cases:
        if case.id in seen_case_ids:
            warnings.append(f"Duplicate test case id: {case.id}")
        seen_case_ids.add(case.id)

        if not case.steps:
            warnings.append(f"Test case {case.id} has no steps.")
        if not case.expected_result:
            warnings.append(f"Test case {case.id} has no expected result.")

        for ref in [*case.requirement_refs, *case.acceptance_criteria_refs]:
            if ref not in known_ids:
                warnings.append(f"Test case {case.id} cites unknown id '{ref}'.")

    ac_ids = {ac.id for ac in ra.acceptance_criteria}
    covered_ac_ids = {ref for case in suite.test_cases for ref in case.acceptance_criteria_refs}
    for ac_id in sorted(ac_ids - covered_ac_ids):
        warnings.append(f"Acceptance criterion {ac_id} has no test case.")

    return warnings


def validate_playwright_bundle(bundle, suite: TestCaseSuite) -> list[str]:
    warnings: list[str] = []
    known_case_ids = {c.id for c in suite.test_cases}
    automatable_ids = {c.id for c in suite.test_cases if c.automation_candidate in ("Yes", "Partial")}

    for case_id in bundle.automated_test_case_ids:
        if case_id not in known_case_ids:
            warnings.append(f"Playwright bundle references unknown test case id '{case_id}'.")
        elif case_id not in automatable_ids:
            warnings.append(f"Playwright bundle automated {case_id}, which was not marked Yes/Partial.")

    if automatable_ids and not bundle.files:
        warnings.append("Test cases were marked automatable but no Playwright files were generated.")

    return warnings
