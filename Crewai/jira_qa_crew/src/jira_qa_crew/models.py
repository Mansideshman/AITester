"""Pydantic structured-output models for every pipeline stage.

These are the internal source of truth. CrewAI agents are asked to fill
them via `output_pydantic`; the markdown/CSV/TypeScript artifacts are all
rendered deterministically from these objects (see services/artifacts.py),
never parsed back out of raw LLM markdown.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

InfoSource = Literal["EXPLICIT", "INFERRED", "MISSING", "ASSUMPTION_REQUIRING_CONFIRMATION"]
AutomationCandidate = Literal["Yes", "No", "Partial"]
Readiness = Literal["READY", "NEEDS_CONFIGURATION"]
TicketStatus = Literal["completed", "completed_with_warnings", "failed"]
FetchSource = Literal["MCP", "REST", "DEMO"]


class RequirementItem(BaseModel):
    id: str = Field(description="Stable identifier, e.g. REQ-001")
    text: str
    source: InfoSource = "EXPLICIT"


class AcceptanceCriterion(BaseModel):
    id: str = Field(description="Stable identifier, e.g. AC-001")
    text: str
    source: InfoSource = "EXPLICIT"


class RequirementAnalysis(BaseModel):
    ticket_key: str
    source: FetchSource
    summary: str
    description: str
    issue_type: str = ""
    status: str = ""
    priority: str = ""
    labels: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    parent: str | None = None
    subtasks: list[str] = Field(default_factory=list)
    linked_issues: list[str] = Field(default_factory=list)
    requirements: list[RequirementItem] = Field(default_factory=list)
    acceptance_criteria: list[AcceptanceCriterion] = Field(default_factory=list)
    business_rules: list[str] = Field(default_factory=list)
    functional_requirements: list[str] = Field(default_factory=list)
    non_functional_requirements: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


TEST_PLAN_SECTIONS = (
    "executive_summary",
    "test_objectives",
    "in_scope",
    "out_of_scope",
    "requirements_coverage",
    "test_strategy",
    "test_environment",
    "test_data_requirements",
    "high_level_scenarios",
    "entry_exit_criteria",
    "risks_dependencies_assumptions",
    "execution_and_reporting",
)

TEST_PLAN_SECTION_TITLES = {
    "executive_summary": "Executive Summary",
    "test_objectives": "Test Objectives",
    "in_scope": "In Scope",
    "out_of_scope": "Out of Scope",
    "requirements_coverage": "Requirements and Acceptance-Criteria Coverage",
    "test_strategy": "Test Strategy, Levels, and Test Types",
    "test_environment": "Test Environment, Tools, and Browser Coverage",
    "test_data_requirements": "Test Data Requirements",
    "high_level_scenarios": "High-Level Test Scenarios",
    "entry_exit_criteria": "Entry and Exit Criteria",
    "risks_dependencies_assumptions": "Risks, Dependencies, Assumptions, and Mitigations",
    "execution_and_reporting": "Execution, Defect Management, Reporting, and Deliverables",
}


class TestScenario(BaseModel):
    id: str = Field(description="e.g. SCN-001")
    description: str
    requirement_refs: list[str] = Field(
        default_factory=list, description="REQ-* and/or AC-* identifiers this scenario covers"
    )


class TestPlan(BaseModel):
    ticket_key: str
    sections: dict[str, str] = Field(
        default_factory=dict,
        description="Keyed by the 12 fixed section slugs in TEST_PLAN_SECTIONS; markdown body per section.",
    )
    scenarios: list[TestScenario] = Field(default_factory=list)


class TestCase(BaseModel):
    id: str = Field(description="e.g. VWO-48-TC-001")
    ticket_key: str
    requirement_refs: list[str] = Field(default_factory=list)
    acceptance_criteria_refs: list[str] = Field(default_factory=list)
    title: str
    objective: str
    priority: str = "Medium"
    test_type: str = ""
    preconditions: list[str] = Field(default_factory=list)
    test_data: str = ""
    steps: list[str] = Field(default_factory=list)
    expected_result: str = ""
    automation_candidate: AutomationCandidate = "No"
    automation_rationale: str = ""
    tags: list[str] = Field(default_factory=list)
    assumptions_or_blockers: str = ""


class TestCaseSuite(BaseModel):
    ticket_key: str
    test_cases: list[TestCase] = Field(default_factory=list)


class PlaywrightFile(BaseModel):
    path: str = Field(description="Relative path under the ticket's playwright/ directory")
    content: str


class PlaywrightBundle(BaseModel):
    ticket_key: str
    files: list[PlaywrightFile] = Field(default_factory=list)
    automated_test_case_ids: list[str] = Field(default_factory=list)
    readiness: Readiness = "NEEDS_CONFIGURATION"
    notes: str = ""


class TraceRow(BaseModel):
    requirement_id: str
    acceptance_criterion_id: str | None = None
    test_case_ids: list[str] = Field(default_factory=list)
    automated_test_ids: list[str] = Field(default_factory=list)
    coverage_status: Literal["COVERED", "PARTIAL", "UNCOVERED"] = "UNCOVERED"
    reason: str = ""


class CoverageSummary(BaseModel):
    total_requirements: int = 0
    covered_requirements: int = 0
    orphan_requirements: list[str] = Field(default_factory=list)
    orphan_test_cases: list[str] = Field(default_factory=list)
    coverage_percent: float = 0.0


class TicketRunResult(BaseModel):
    ticket_key: str
    status: TicketStatus
    source: FetchSource | None = None
    requirement_analysis: RequirementAnalysis | None = None
    test_plan: TestPlan | None = None
    test_case_suite: TestCaseSuite | None = None
    playwright_bundle: PlaywrightBundle | None = None
    traceability: list[TraceRow] = Field(default_factory=list)
    coverage: CoverageSummary | None = None
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    started_at: datetime
    completed_at: datetime | None = None
    artifact_dir: str | None = None


class RunSummary(BaseModel):
    run_id: str
    started_at: datetime
    completed_at: datetime | None = None
    tickets: list[str] = Field(default_factory=list)
    results: list[TicketRunResult] = Field(default_factory=list)

    @property
    def completed(self) -> int:
        return sum(1 for r in self.results if r.status == "completed")

    @property
    def completed_with_warnings(self) -> int:
        return sum(1 for r in self.results if r.status == "completed_with_warnings")

    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.status == "failed")
