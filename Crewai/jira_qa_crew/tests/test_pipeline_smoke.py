"""End-to-end pipeline wiring, with the CrewAI/LLM layer mocked out.

This proves run_pipeline/run_ticket correctly drive parsing, crew building,
output extraction, validation, traceability, and artifact writing -- without
making a real network or LLM call (see scripts/smoke_test.py for that).
"""

from types import SimpleNamespace

import pytest

from jira_qa_crew.crew.callbacks import StageTracker
from jira_qa_crew.exceptions import TicketValidationError
from jira_qa_crew.models import (
    TEST_PLAN_SECTIONS,
    AcceptanceCriterion,
    PlaywrightBundle,
    PlaywrightFile,
    RequirementAnalysis,
    RequirementItem,
    TestCase,
    TestCaseSuite,
    TestPlan,
    TestScenario,
)
from jira_qa_crew.services import pipeline


def _fake_outputs(ticket_key: str):
    ra = RequirementAnalysis(
        ticket_key=ticket_key,
        source="DEMO",
        summary="s",
        description="d",
        requirements=[RequirementItem(id="REQ-001", text="r")],
        acceptance_criteria=[AcceptanceCriterion(id="AC-001", text="a")],
    )
    plan = TestPlan(
        ticket_key=ticket_key,
        sections={s: "body" for s in TEST_PLAN_SECTIONS},
        scenarios=[TestScenario(id="SCN-001", description="d", requirement_refs=["REQ-001"])],
    )
    suite = TestCaseSuite(
        ticket_key=ticket_key,
        test_cases=[
            TestCase(
                id=f"{ticket_key}-TC-001",
                ticket_key=ticket_key,
                requirement_refs=["REQ-001"],
                acceptance_criteria_refs=["AC-001"],
                title="t",
                objective="o",
                steps=["step"],
                expected_result="result",
                automation_candidate="Yes",
            )
        ],
    )
    bundle = PlaywrightBundle(
        ticket_key=ticket_key,
        automated_test_case_ids=[f"{ticket_key}-TC-001"],
        readiness="READY",
        files=[PlaywrightFile(path=f"tests/{ticket_key.lower()}.spec.ts", content="test('x', async () => {});")],
    )
    return [SimpleNamespace(pydantic=o) for o in (ra, plan, suite, bundle)]


class FakeCrew:
    def __init__(self, ticket_key: str, fail_times: int = 0):
        self.ticket_key = ticket_key
        self._fail_times = fail_times
        self._calls = 0

    def kickoff(self):
        self._calls += 1
        if self._calls <= self._fail_times:
            raise RuntimeError("simulated transient LLM failure")
        return SimpleNamespace(tasks_output=_fake_outputs(self.ticket_key))


@pytest.fixture(autouse=True)
def patch_crew_factory(monkeypatch):
    monkeypatch.setattr(pipeline, "build_groq_llm", lambda config: object())


def test_run_ticket_happy_path(base_settings, monkeypatch):
    monkeypatch.setattr(
        pipeline, "build_ticket_crew",
        lambda config, ticket_key, llm, gateway=None: (FakeCrew(ticket_key), StageTracker(ticket_key=ticket_key)),
    )

    result = pipeline.run_ticket(base_settings, "VWO-48", llm=object())

    assert result.status == "completed"
    assert result.source == "DEMO"
    assert result.coverage.coverage_percent == 100.0
    assert result.artifact_dir is None  # rendering happens in run_pipeline, not run_ticket


def test_run_ticket_retries_once_then_succeeds(base_settings, monkeypatch):
    settings = base_settings.__class__(**{**base_settings.__dict__, "pipeline_max_retries": 2})
    crew = FakeCrew("VWO-48", fail_times=1)
    monkeypatch.setattr(
        pipeline, "build_ticket_crew",
        lambda config, ticket_key, llm, gateway=None: (crew, StageTracker(ticket_key=ticket_key)),
    )

    result = pipeline.run_ticket(settings, "VWO-48", llm=object())

    assert result.status == "completed"
    assert crew._calls == 2


def test_run_ticket_records_error_after_exhausting_retries(base_settings, monkeypatch):
    crew = FakeCrew("VWO-48", fail_times=99)
    monkeypatch.setattr(
        pipeline, "build_ticket_crew",
        lambda config, ticket_key, llm, gateway=None: (crew, StageTracker(ticket_key=ticket_key)),
    )

    result = pipeline.run_ticket(base_settings, "VWO-48", llm=object())

    assert result.status == "failed"
    assert result.errors


def test_run_pipeline_isolates_each_ticket_and_writes_artifacts(base_settings, monkeypatch, tmp_path):
    settings = base_settings.__class__(**{**base_settings.__dict__, "output_dir": str(tmp_path)})
    monkeypatch.setattr(
        pipeline, "build_ticket_crew",
        lambda config, ticket_key, llm, gateway=None: (FakeCrew(ticket_key), StageTracker(ticket_key=ticket_key)),
    )

    summary = pipeline.run_pipeline(settings, "VWO-48, VWO-49")

    assert summary.completed == 2
    assert {r.ticket_key for r in summary.results} == {"VWO-48", "VWO-49"}
    for result in summary.results:
        assert result.artifact_dir is not None
        assert (tmp_path / summary.run_id / result.ticket_key / "test_plan.md").exists()
    assert (tmp_path / summary.run_id / "manifest.json").exists()


def test_run_pipeline_rejects_input_with_no_valid_tickets(base_settings):
    with pytest.raises(TicketValidationError):
        pipeline.run_pipeline(base_settings, "not a ticket")


def test_run_pipeline_rejects_too_many_tickets(base_settings):
    settings = base_settings.__class__(**{**base_settings.__dict__, "pipeline_max_tickets": 1})
    with pytest.raises(TicketValidationError):
        pipeline.run_pipeline(settings, "VWO-48, VWO-49")
