"""Typed exceptions for the Jira QA Crew pipeline."""

from __future__ import annotations


class JiraQaCrewError(Exception):
    """Base class for every error this package raises deliberately."""


class ConfigError(JiraQaCrewError):
    """Required configuration is missing or invalid for the selected mode."""


class JiraProviderError(JiraQaCrewError):
    """A single Jira access provider (MCP or REST) failed to fetch an issue."""

    def __init__(self, source: str, message: str) -> None:
        self.source = source
        super().__init__(f"[{source}] {message}")


class JiraMCPError(JiraProviderError):
    def __init__(self, message: str) -> None:
        super().__init__("MCP", message)


class JiraRestError(JiraProviderError):
    def __init__(self, message: str) -> None:
        super().__init__("REST", message)


class JiraFetchError(JiraQaCrewError):
    """Both MCP and REST (or the only configured provider) failed."""

    def __init__(
        self,
        ticket_key: str,
        mcp_error: Exception | None,
        rest_error: Exception | None,
    ) -> None:
        self.ticket_key = ticket_key
        self.mcp_error = mcp_error
        self.rest_error = rest_error
        parts = [f"Could not fetch {ticket_key}."]
        if mcp_error is not None:
            parts.append(f"MCP: {mcp_error}")
        if rest_error is not None:
            parts.append(f"REST: {rest_error}")
        super().__init__(" ".join(parts))


class TicketValidationError(JiraQaCrewError):
    """A ticket ID in the raw user input failed normalization/validation."""


class PipelineStageError(JiraQaCrewError):
    """A CrewAI stage failed for a ticket after the allowed repair attempts."""

    def __init__(self, ticket_key: str, stage: str, cause: Exception) -> None:
        self.ticket_key = ticket_key
        self.stage = stage
        self.cause = cause
        super().__init__(f"{ticket_key}: stage '{stage}' failed: {cause}")


class ArtifactError(JiraQaCrewError):
    """Rendering or writing a run artifact failed."""
