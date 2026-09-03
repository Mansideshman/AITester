"""Shared provider contract: JiraProvider + the raw payload it returns.

IssuePayload is intentionally "raw" (close to what Jira returns, normalized
to plain text) -- turning it into a validated RequirementAnalysis with
REQ-*/AC-* IDs and EXPLICIT/INFERRED classification is the Jira Analyst
agent's job, not the provider's.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from pydantic import BaseModel, Field


class IssuePayload(BaseModel):
    ticket_key: str
    source: str  # "MCP" | "REST" | "DEMO"
    summary: str = ""
    description_text: str = ""
    issue_type: str = ""
    status: str = ""
    priority: str = ""
    labels: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    parent: str | None = None
    subtasks: list[str] = Field(default_factory=list)
    linked_issues: list[str] = Field(default_factory=list)
    acceptance_criteria_text: str = ""
    comments: list[str] = Field(default_factory=list)


class JiraProvider(ABC):
    """One way to fetch a Jira issue. Read-only by contract."""

    name: str

    @abstractmethod
    def fetch_issue(self, ticket_key: str) -> IssuePayload:
        """Fetch and normalize one issue. Raise a JiraProviderError subclass on failure."""
        raise NotImplementedError
