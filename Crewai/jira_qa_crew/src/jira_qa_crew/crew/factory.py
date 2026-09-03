"""Wires one fresh crew (agents + tasks + tracker) for a single ticket.

A new Agent/Task/Crew/tracker set is built per ticket (never reused across
tickets), so nothing about one ticket's context can leak into another's --
satisfying "create a fresh crew context for each ticket".
"""

from __future__ import annotations

from crewai import LLM, Crew, Process

# crewai marks messages with a "cache_breakpoint" key for providers that
# support prompt caching (Anthropic, OpenAI). Its generic LiteLLM passthrough
# path (used for Groq, which isn't a "native" provider) never strips that key
# before sending, and Groq's API rejects the unknown field. Groq doesn't
# support this caching feature, so disable the marker instead.
import crewai.llms.cache as _crewai_cache

_crewai_cache.mark_cache_breakpoint = lambda message: message

from ..config import Settings
from ..jira.gateway import JiraGateway
from ..tools.jira_tool import FetchJiraIssueTool
from .agents import build_agents
from .callbacks import STAGE_ORDER, StageTracker
from .tasks import build_tasks


def build_groq_llm(config: Settings) -> LLM:
    config.require_llm()
    return LLM(model=f"groq/{config.llm_model}", api_key=config.llm_api_key, temperature=config.llm_temperature)


def build_ticket_crew(
    config: Settings,
    ticket_key: str,
    llm: LLM,
    gateway: JiraGateway | None = None,
) -> tuple[Crew, StageTracker]:
    gateway = gateway or JiraGateway(config)
    jira_tool = FetchJiraIssueTool(gateway=gateway)
    agents = build_agents(llm, jira_tool)

    tracker = StageTracker(ticket_key=ticket_key)
    stage_callbacks = {
        stage: tracker.make_task_callback(
            stage, STAGE_ORDER[i + 1] if i + 1 < len(STAGE_ORDER) else None
        )
        for i, stage in enumerate(STAGE_ORDER)
    }

    tasks = build_tasks(agents, ticket_key, stage_callbacks=stage_callbacks)

    crew = Crew(
        agents=[agents[name] for name in STAGE_ORDER],
        tasks=tasks,
        process=Process.sequential,
        verbose=True,
    )
    return crew, tracker
