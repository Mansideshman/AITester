"""The only CrewAI tool with Jira access -- given exclusively to the Jira Analyst agent.

Read-only by construction: it exposes nothing but `fetch_issue`. There is no
write/transition/delete path anywhere in this tool, satisfying the "never
expose Jira write tools" requirement without relying on prompting alone.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from crewai.tools import BaseTool

from ..jira.gateway import JiraGateway


class FetchJiraIssueInput(BaseModel):
    ticket_key: str = Field(description="The Jira issue key to fetch, e.g. 'VWO-48'.")


class FetchJiraIssueTool(BaseTool):
    name: str = "fetch_jira_issue"
    description: str = (
        "Fetch one Jira issue by its key (e.g. 'VWO-48') and return its fields as JSON: "
        "summary, description, issue type, status, priority, labels, components, parent, "
        "subtasks, linked issues, acceptance criteria text, and comments (if enabled). "
        "Read-only -- this tool cannot modify, transition, or delete Jira issues."
    )
    args_schema: type[BaseModel] = FetchJiraIssueInput

    _gateway: JiraGateway

    def __init__(self, gateway: JiraGateway, **kwargs) -> None:
        super().__init__(**kwargs)
        self._gateway = gateway

    def _run(self, ticket_key: str) -> str:
        payload = self._gateway.fetch_issue(ticket_key)
        return payload.model_dump_json()
