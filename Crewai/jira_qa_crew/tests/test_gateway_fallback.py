import pytest

from jira_qa_crew.config import Settings
from jira_qa_crew.exceptions import JiraFetchError, JiraMCPError, JiraRestError
from jira_qa_crew.jira.base import IssuePayload, JiraProvider
from jira_qa_crew.jira.gateway import JiraGateway


class FakeProvider(JiraProvider):
    def __init__(self, name, *, payload: IssuePayload | None = None, error: Exception | None = None):
        self.name = name
        self._payload = payload
        self._error = error
        self.calls = 0

    def fetch_issue(self, ticket_key: str) -> IssuePayload:
        self.calls += 1
        if self._error:
            raise self._error
        return self._payload


def _settings(**overrides) -> Settings:
    return Settings(llm_model="m", llm_api_key="k", **overrides)


def test_auto_mode_uses_mcp_when_it_succeeds():
    mcp = FakeProvider("MCP", payload=IssuePayload(ticket_key="X-1", source="MCP", summary="from mcp"))
    rest = FakeProvider("REST", payload=IssuePayload(ticket_key="X-1", source="REST", summary="from rest"))
    gw = JiraGateway(_settings(jira_integration_mode="auto"), mcp_provider=mcp, rest_provider=rest)

    result = gw.fetch_issue("X-1")

    assert result.source == "MCP"
    assert mcp.calls == 1
    assert rest.calls == 0


def test_auto_mode_falls_back_to_rest_when_mcp_fails():
    mcp = FakeProvider("MCP", error=JiraMCPError("not configured"))
    rest = FakeProvider("REST", payload=IssuePayload(ticket_key="X-1", source="REST", summary="from rest"))
    gw = JiraGateway(_settings(jira_integration_mode="auto"), mcp_provider=mcp, rest_provider=rest)

    result = gw.fetch_issue("X-1")

    assert result.source == "REST"
    assert mcp.calls == 1
    assert rest.calls == 1


def test_auto_mode_raises_when_both_fail():
    mcp = FakeProvider("MCP", error=JiraMCPError("no mcp"))
    rest = FakeProvider("REST", error=JiraRestError("no rest"))
    gw = JiraGateway(_settings(jira_integration_mode="auto"), mcp_provider=mcp, rest_provider=rest)

    with pytest.raises(JiraFetchError) as exc_info:
        gw.fetch_issue("X-1")

    assert exc_info.value.mcp_error is mcp._error
    assert exc_info.value.rest_error is rest._error


def test_mcp_only_mode_never_calls_rest():
    mcp = FakeProvider("MCP", error=JiraMCPError("boom"))
    rest = FakeProvider("REST", payload=IssuePayload(ticket_key="X-1", source="REST"))
    gw = JiraGateway(_settings(jira_integration_mode="mcp"), mcp_provider=mcp, rest_provider=rest)

    with pytest.raises(JiraMCPError):
        gw.fetch_issue("X-1")
    assert rest.calls == 0


def test_rest_only_mode_never_calls_mcp():
    mcp = FakeProvider("MCP", payload=IssuePayload(ticket_key="X-1", source="MCP"))
    rest = FakeProvider("REST", error=JiraRestError("boom"))
    gw = JiraGateway(_settings(jira_integration_mode="rest"), mcp_provider=mcp, rest_provider=rest)

    with pytest.raises(JiraRestError):
        gw.fetch_issue("X-1")
    assert mcp.calls == 0


def test_demo_mode_never_touches_live_providers_even_on_failure():
    mcp = FakeProvider("MCP", error=JiraMCPError("would fail"))
    rest = FakeProvider("REST", error=JiraRestError("would also fail"))
    demo = FakeProvider("DEMO", payload=IssuePayload(ticket_key="X-1", source="DEMO", summary="fixture"))
    gw = JiraGateway(_settings(demo_mode=True), mcp_provider=mcp, rest_provider=rest, demo_provider=demo)

    result = gw.fetch_issue("X-1")

    assert result.source == "DEMO"
    assert mcp.calls == 0
    assert rest.calls == 0
