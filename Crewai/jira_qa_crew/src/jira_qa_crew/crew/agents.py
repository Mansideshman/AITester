"""Builds the 4 CrewAI agents from prompts/agents.yaml.

Only the Jira Analyst receives the Jira tool -- the other three agents have
no way to reach Jira at all, which is the actual enforcement mechanism for
"give Jira access only to the Jira Analyst" (not just a prompt instruction).
"""

from __future__ import annotations

from pathlib import Path

import yaml
from crewai import LLM, Agent

from ..tools.jira_tool import FetchJiraIssueTool

_PROMPTS_PATH = Path(__file__).resolve().parent.parent / "prompts" / "agents.yaml"


def _load_specs() -> dict:
    return yaml.safe_load(_PROMPTS_PATH.read_text())


def build_agents(llm: LLM, jira_tool: FetchJiraIssueTool) -> dict[str, Agent]:
    specs = _load_specs()

    jira_analyst = Agent(
        role=specs["jira_analyst"]["role"],
        goal=specs["jira_analyst"]["goal"],
        backstory=specs["jira_analyst"]["backstory"],
        tools=[jira_tool],
        llm=llm,
        verbose=True,
    )
    test_plan_writer = Agent(
        role=specs["test_plan_writer"]["role"],
        goal=specs["test_plan_writer"]["goal"],
        backstory=specs["test_plan_writer"]["backstory"],
        llm=llm,
        verbose=True,
    )
    test_case_writer = Agent(
        role=specs["test_case_writer"]["role"],
        goal=specs["test_case_writer"]["goal"],
        backstory=specs["test_case_writer"]["backstory"],
        llm=llm,
        verbose=True,
    )
    playwright_coder = Agent(
        role=specs["playwright_coder"]["role"],
        goal=specs["playwright_coder"]["goal"],
        backstory=specs["playwright_coder"]["backstory"],
        llm=llm,
        verbose=True,
    )

    return {
        "jira_analyst": jira_analyst,
        "test_plan_writer": test_plan_writer,
        "test_case_writer": test_case_writer,
        "playwright_coder": playwright_coder,
    }
