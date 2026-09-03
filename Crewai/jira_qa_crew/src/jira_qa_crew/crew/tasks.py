"""Builds the 4 sequential CrewAI tasks from prompts/tasks.yaml.

Each task's output is validated (output_pydantic) and passed as explicit
context to the next task, so nothing downstream depends on parsing raw LLM
markdown -- the deterministic renderers in services/artifacts.py work off
these Pydantic objects, not the model's prose.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from crewai import Agent, Task

from ..models import PlaywrightBundle, RequirementAnalysis, TestCaseSuite, TestPlan

_PROMPTS_PATH = Path(__file__).resolve().parent.parent / "prompts" / "tasks.yaml"


def _load_specs() -> dict:
    return yaml.safe_load(_PROMPTS_PATH.read_text())


def build_tasks(
    agents: dict[str, Agent],
    ticket_key: str,
    stage_callbacks: dict[str, object] | None = None,
) -> list[Task]:
    specs = _load_specs()
    stage_callbacks = stage_callbacks or {}

    def fmt(spec: dict) -> dict:
        return {
            "description": spec["description"].format(ticket_key=ticket_key),
            "expected_output": spec["expected_output"].format(ticket_key=ticket_key),
        }

    analyze_task = Task(
        **fmt(specs["analyze_ticket"]),
        agent=agents["jira_analyst"],
        output_pydantic=RequirementAnalysis,
        callback=stage_callbacks.get("jira_analyst"),
    )
    plan_task = Task(
        **fmt(specs["write_test_plan"]),
        agent=agents["test_plan_writer"],
        context=[analyze_task],
        output_pydantic=TestPlan,
        callback=stage_callbacks.get("test_plan_writer"),
    )
    cases_task = Task(
        **fmt(specs["write_test_cases"]),
        agent=agents["test_case_writer"],
        context=[analyze_task, plan_task],
        output_pydantic=TestCaseSuite,
        callback=stage_callbacks.get("test_case_writer"),
    )
    playwright_task = Task(
        **fmt(specs["generate_playwright"]),
        agent=agents["playwright_coder"],
        context=[cases_task],
        output_pydantic=PlaywrightBundle,
        callback=stage_callbacks.get("playwright_coder"),
    )

    return [analyze_task, plan_task, cases_task, playwright_task]
