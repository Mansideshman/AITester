"""Jira MCP provider (primary, when configured).

The provider decision itself (MCP vs REST vs fail) lives in gateway.py and
is plain application logic -- never an LLM choice. This class only knows
how to call one configured MCP server's "get issue" tool and normalize
whatever it returns into an IssuePayload.

Different Jira MCP servers expose different tool names and argument
shapes (e.g. `getJiraIssue` vs `jira_get_issue`, `issueKey` vs `key`), so
both are configurable via JIRA_MCP_GET_ISSUE_TOOL and a small set of
candidate argument names tried in order.
"""

from __future__ import annotations

from typing import Any

from ..config import Settings
from ..exceptions import JiraMCPError
from .adf import adf_to_text
from .base import IssuePayload, JiraProvider

_CANDIDATE_ARG_NAMES = ("issueKey", "issue_key", "key", "ticket", "id")


class JiraMCPProvider(JiraProvider):
    name = "MCP"

    def __init__(self, config: Settings) -> None:
        self._config = config

    def _require_configured(self) -> None:
        c = self._config
        if c.jira_mcp_transport == "stdio":
            if not c.jira_mcp_command:
                raise JiraMCPError("JIRA_MCP_TRANSPORT=stdio but JIRA_MCP_COMMAND is not set.")
        else:
            if not c.jira_mcp_url:
                raise JiraMCPError("JIRA_MCP_TRANSPORT=streamable_http but JIRA_MCP_URL is not set.")
        if not c.jira_mcp_get_issue_tool:
            raise JiraMCPError("JIRA_MCP_GET_ISSUE_TOOL is not set (no known issue-fetch tool name).")

    def _build_adapter_params(self) -> dict:
        c = self._config
        if c.jira_mcp_transport == "stdio":
            return {"command": c.jira_mcp_command, "args": c.jira_mcp_args}
        return {
            "url": c.jira_mcp_url,
            "transport": "streamable-http",
            "headers": c.jira_mcp_headers,
        }

    def fetch_issue(self, ticket_key: str) -> IssuePayload:
        self._require_configured()
        c = self._config

        try:
            from crewai_tools import MCPServerAdapter
        except ImportError as exc:
            raise JiraMCPError(
                "crewai-tools with MCP support is not installed (pip install 'crewai-tools[mcp]')."
            ) from exc

        params = self._build_adapter_params()

        try:
            with MCPServerAdapter(params, connect_timeout=c.jira_mcp_timeout_seconds) as tools:
                tool = self._find_tool(tools, c.jira_mcp_get_issue_tool)
                raw = self._call_tool(tool, ticket_key)
        except JiraMCPError:
            raise
        except TimeoutError as exc:
            raise JiraMCPError(f"Timed out after {c.jira_mcp_timeout_seconds}s connecting to MCP server.") from exc
        except Exception as exc:  # noqa: BLE001 - any transport/library failure must degrade to REST
            raise JiraMCPError(f"MCP call failed: {exc}") from exc

        return self._to_payload(ticket_key, raw)

    def _find_tool(self, tools: Any, tool_name: str) -> Any:
        for tool in tools:
            if getattr(tool, "name", None) == tool_name:
                return tool
        available = ", ".join(getattr(t, "name", "?") for t in tools)
        raise JiraMCPError(f"MCP server has no tool named '{tool_name}'. Available: {available or 'none'}")

    def _call_tool(self, tool: Any, ticket_key: str) -> Any:
        last_error: Exception | None = None
        for arg_name in _CANDIDATE_ARG_NAMES:
            try:
                return tool.run(**{arg_name: ticket_key})
            except TypeError as exc:
                last_error = exc
                continue
        raise JiraMCPError(
            f"Could not call MCP tool with any known argument name {_CANDIDATE_ARG_NAMES}: {last_error}"
        )

    def _to_payload(self, ticket_key: str, raw: Any) -> IssuePayload:
        if isinstance(raw, str):
            import json

            try:
                raw = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise JiraMCPError("MCP tool returned a non-JSON string response.") from exc

        if not isinstance(raw, dict):
            raise JiraMCPError(f"MCP tool returned an unusable response type: {type(raw).__name__}")

        fields = raw.get("fields", raw)

        return IssuePayload(
            ticket_key=ticket_key,
            source="MCP",
            summary=fields.get("summary", "") or "",
            description_text=adf_to_text(fields.get("description")) or str(fields.get("description") or ""),
            issue_type=_name(fields.get("issuetype")),
            status=_name(fields.get("status")),
            priority=_name(fields.get("priority")),
            labels=list(fields.get("labels") or []),
            components=[_name(c) for c in (fields.get("components") or [])],
            parent=_name(fields.get("parent")) or None,
            subtasks=[_name(s) for s in (fields.get("subtasks") or [])],
            linked_issues=[_name(link) for link in (fields.get("issuelinks") or [])],
            acceptance_criteria_text=str(fields.get("acceptance_criteria") or ""),
            comments=[],
        )


def _name(value: Any) -> str:
    if isinstance(value, dict):
        return value.get("name") or value.get("key") or ""
    return str(value) if value else ""
