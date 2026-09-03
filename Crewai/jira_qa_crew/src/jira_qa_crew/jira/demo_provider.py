"""Demo-mode Jira provider: reads fixture tickets instead of calling Jira.

Only used when DEMO_MODE is explicitly enabled (see gateway.py). Demo data
must never silently substitute for a failed live MCP/REST call -- if a live
provider fails, the gateway raises JiraFetchError, it does not fall back here.
"""

from __future__ import annotations

import json
from pathlib import Path

from ..exceptions import JiraRestError
from .base import IssuePayload, JiraProvider

DEFAULT_FIXTURE_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "demo_tickets.json"


class DemoJiraProvider(JiraProvider):
    name = "DEMO"

    def __init__(self, fixture_path: Path | str | None = None) -> None:
        self._fixture_path = Path(fixture_path) if fixture_path else DEFAULT_FIXTURE_PATH
        self._tickets: dict | None = None

    def _load(self) -> dict:
        if self._tickets is None:
            try:
                self._tickets = json.loads(self._fixture_path.read_text())
            except FileNotFoundError as exc:
                raise JiraRestError(f"Demo fixture file not found: {self._fixture_path}") from exc
            except json.JSONDecodeError as exc:
                raise JiraRestError(f"Demo fixture file is not valid JSON: {self._fixture_path}") from exc
        return self._tickets

    def fetch_issue(self, ticket_key: str) -> IssuePayload:
        tickets = self._load()
        data = tickets.get(ticket_key)
        if data is None:
            raise JiraRestError(
                f"No demo fixture for {ticket_key}. Available: {', '.join(sorted(tickets)) or 'none'}"
            )
        payload = dict(data)
        payload["ticket_key"] = ticket_key
        payload["source"] = "DEMO"
        return IssuePayload(**payload)
