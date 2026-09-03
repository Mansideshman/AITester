from jira_qa_crew.models import (
    AcceptanceCriterion,
    PlaywrightBundle,
    RequirementAnalysis,
    RequirementItem,
    TestCase,
    TestCaseSuite,
    TestPlan,
    TestScenario,
)
from jira_qa_crew.services import traceability, validation


def _ra() -> RequirementAnalysis:
    return RequirementAnalysis(
        ticket_key="X-1",
        source="DEMO",
        summary="Cart total wrong",
        description="desc",
        requirements=[RequirementItem(id="REQ-001", text="Total must be correct")],
        acceptance_criteria=[
            AcceptanceCriterion(id="AC-001", text="3+ items shows discounted total"),
            AcceptanceCriterion(id="AC-002", text="invalid code leaves total unchanged"),
        ],
    )


def test_validate_requirement_analysis_flags_empty_extraction():
    empty = RequirementAnalysis(ticket_key="X-1", source="DEMO", summary="", description="")
    warnings = validation.validate_requirement_analysis(empty)
    assert any("No requirements" in w for w in warnings)
    assert any("No acceptance criteria" in w for w in warnings)
    assert any("summary is empty" in w for w in warnings)


def test_validate_requirement_analysis_detects_duplicate_ids():
    ra = RequirementAnalysis(
        ticket_key="X-1",
        source="DEMO",
        summary="s",
        description="d",
        requirements=[RequirementItem(id="REQ-001", text="a"), RequirementItem(id="REQ-001", text="b")],
    )
    warnings = validation.validate_requirement_analysis(ra)
    assert any("Duplicate" in w for w in warnings)


def test_validate_test_plan_flags_missing_sections_and_unknown_refs():
    ra = _ra()
    plan = TestPlan(
        ticket_key="X-1",
        sections={"executive_summary": "ok"},
        scenarios=[TestScenario(id="SCN-001", description="d", requirement_refs=["AC-999"])],
    )
    warnings = validation.validate_test_plan(plan, ra)
    assert any("missing section" in w for w in warnings)
    assert any("unknown id 'AC-999'" in w for w in warnings)


def test_validate_test_case_suite_flags_orphan_acceptance_criteria():
    ra = _ra()
    suite = TestCaseSuite(
        ticket_key="X-1",
        test_cases=[
            TestCase(
                id="X-1-TC-001",
                ticket_key="X-1",
                requirement_refs=["REQ-001"],
                acceptance_criteria_refs=["AC-001"],
                title="t",
                objective="o",
                steps=["step"],
                expected_result="result",
            )
        ],
    )
    warnings = validation.validate_test_case_suite(suite, ra)
    assert any("AC-002 has no test case" in w for w in warnings)


def test_validate_playwright_bundle_flags_non_automatable_reference():
    suite = TestCaseSuite(
        ticket_key="X-1",
        test_cases=[
            TestCase(
                id="X-1-TC-001", ticket_key="X-1", title="t", objective="o",
                steps=["s"], expected_result="r", automation_candidate="No",
            )
        ],
    )
    bundle = PlaywrightBundle(ticket_key="X-1", automated_test_case_ids=["X-1-TC-001"])
    warnings = validation.validate_playwright_bundle(bundle, suite)
    assert any("not marked Yes/Partial" in w for w in warnings)


def test_traceability_covers_automated_partial_and_uncovered():
    ra = _ra()
    suite = TestCaseSuite(
        ticket_key="X-1",
        test_cases=[
            TestCase(
                id="X-1-TC-001", ticket_key="X-1", requirement_refs=["REQ-001"],
                acceptance_criteria_refs=["AC-001"], title="t1", objective="o",
                steps=["s"], expected_result="r", automation_candidate="Yes",
            ),
            TestCase(
                id="X-1-TC-002", ticket_key="X-1", acceptance_criteria_refs=["AC-002"],
                title="t2", objective="o", steps=["s"], expected_result="r",
                automation_candidate="No",
            ),
        ],
    )
    bundle = PlaywrightBundle(ticket_key="X-1", automated_test_case_ids=["X-1-TC-001"], readiness="READY")

    rows, coverage = traceability.build_traceability(ra, suite, bundle)
    by_id = {row.requirement_id: row for row in rows}

    assert by_id["REQ-001"].coverage_status == "COVERED"
    assert by_id["AC-001"].coverage_status == "COVERED"
    assert by_id["AC-002"].coverage_status == "PARTIAL"
    assert coverage.total_requirements == 3
    assert coverage.covered_requirements == 3
    assert coverage.coverage_percent == 100.0
