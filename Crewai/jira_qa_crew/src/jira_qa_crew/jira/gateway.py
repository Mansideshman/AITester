"""JiraGateway: the one place that decides MCP vs REST vs demo vs fail.

    mode = auto: try MCP, on failure try REST, on both failure raise JiraFetchError
    mode = mcp:  use only MCP
    mode = rest: use only REST
    demo_mode:   use only the demo fixture provider (overrides `mode`)

This decision is deterministic application logic, not something an LLM
chooses -- see FetchJiraIssueTool, which is the only thing agents touch.
"""

from __future__ import annotations

import logging

from ..config import Settings
from ..exceptions import JiraFetchError, JiraMCPError, JiraRestError
from .base import IssuePayload, JiraProvider
from .demo_provider import DemoJiraProvider
from .mcp_provider import JiraMCPProvider
from .rest_provider import JiraRestProvider

logger = logging.getLogger(__name__)


class JiraGateway:
    def __init__(
        self,
        config: Settings,
        mcp_provider: JiraProvider | None = None,
        rest_provider: JiraProvider | None = None,
        demo_provider: JiraProvider | None = None,
    ) -> None:
        self._config = config
        self._mcp = mcp_provider or JiraMCPProvider(config)
        self._rest = rest_provider or JiraRestProvider(config)
        self._demo = demo_provider or DemoJiraProvider()

    def fetch_issue(self, ticket_key: str) -> IssuePayload:
        if self._config.demo_mode:
            logger.info("jira_gateway: demo mode, fetching %s from fixtures", ticket_key)
            return self._demo.fetch_issue(ticket_key)

        mode = self._config.jira_integration_mode

        if mode == "mcp":
            return self._mcp.fetch_issue(ticket_key)

        if mode == "rest":
            return self._rest.fetch_issue(ticket_key)

        # auto: MCP first, REST fallback
        mcp_error: Exception | None = None
        try:
            payload = self._mcp.fetch_issue(ticket_key)
            logger.info("jira_gateway: %s fetched via MCP", ticket_key)
            return payload
        except JiraMCPError as exc:
            mcp_error = exc
            logger.warning("jira_gateway: MCP failed for %s (%s), falling back to REST", ticket_key, exc)

        try:
            payload = self._rest.fetch_issue(ticket_key)
            logger.info("jira_gateway: %s fetched via REST (after MCP fallback)", ticket_key)
            return payload
        except JiraRestError as rest_error:
            raise JiraFetchError(ticket_key, mcp_error, rest_error) from rest_error
