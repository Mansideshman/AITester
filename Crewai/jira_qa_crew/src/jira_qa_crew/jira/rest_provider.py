"""Jira Cloud REST API v3 provider (fallback, or primary in mode=rest)."""

from __future__ import annotations

import requests

from ..config import Settings
from ..exceptions import JiraRestError
from .adf import adf_to_text
from .base import IssuePayload, JiraProvider


class JiraRestProvider(JiraProvider):
    name = "REST"

    def __init__(self, config: Settings, session: requests.Session | None = None) -> None:
        self._config = config
        self._session = session or requests.Session()

    def _auth(self):
        c = self._config
        if c.jira_auth_mode == "bearer":
            if not c.jira_bearer_token:
                raise JiraRestError("JIRA_AUTH_MODE=bearer but JIRA_BEARER_TOKEN is not set.")
            return None  # handled via header
        if not c.jira_email or not c.jira_api_token:
            raise JiraRestError("JIRA_AUTH_MODE=basic needs JIRA_EMAIL and JIRA_API_TOKEN.")
        return (c.jira_email, c.jira_api_token)

    def _headers(self) -> dict:
        headers = {"Accept": "application/json"}
        if self._config.jira_auth_mode == "bearer" and self._config.jira_bearer_token:
            headers["Authorization"] = f"Bearer {self._config.jira_bearer_token}"
        return headers

    def fetch_issue(self, ticket_key: str) -> IssuePayload:
        c = self._config
        if not c.jira_url:
            raise JiraRestError("JIRA_URL is not configured.")

        url = f"{c.jira_url.rstrip('/')}/rest/api/{c.jira_api_version}/issue/{ticket_key}"

        try:
            response = self._session.get(
                url,
                auth=self._auth(),
                headers=self._headers(),
                timeout=20,
            )
        except requests.Timeout as exc:
            raise JiraRestError(f"Request to {url} timed out.") from exc
        except requests.ConnectionError as exc:
            raise JiraRestError(f"Could not connect to {c.jira_url}: {exc}") from exc
        except requests.RequestException as exc:
            raise JiraRestError(f"Request to {url} failed: {exc}") from exc

        if response.status_code == 401:
            raise JiraRestError("Authentication failed (401). Check JIRA_EMAIL/JIRA_API_TOKEN or bearer token.")
        if response.status_code == 403:
            raise JiraRestError("Not permitted to view this issue (403).")
        if response.status_code == 404:
            raise JiraRestError(f"Issue {ticket_key} not found (404).")
        if response.status_code == 429:
            raise JiraRestError("Rate limited by Jira (429).")
        if response.status_code >= 500:
            raise JiraRestError(f"Jira server error ({response.status_code}).")
        if not response.ok:
            raise JiraRestError(f"Unexpected status {response.status_code}: {response.text[:200]}")

        try:
            data = response.json()
        except ValueError as exc:
            raise JiraRestError("Response was not valid JSON.") from exc

        return self._to_payload(ticket_key, data)

    def _to_payload(self, ticket_key: str, data: dict) -> IssuePayload:
        c = self._config
        fields = data.get("fields", {}) or {}

        description_text = adf_to_text(fields.get("description"))

        acceptance_criteria_text = ""
        if c.jira_acceptance_criteria_field:
            raw_ac = fields.get(c.jira_acceptance_criteria_field)
            acceptance_criteria_text = adf_to_text(raw_ac) if isinstance(raw_ac, (dict, list)) else (raw_ac or "")

        comments: list[str] = []
        if c.jira_include_comments:
            comment_field = fields.get("comment", {}) or {}
            for comment in (comment_field.get("comments") or [])[: c.jira_max_comments]:
                comments.append(adf_to_text(comment.get("body")))

        parent = fields.get("parent")
        subtasks = fields.get("subtasks") or []
        links = fields.get("issuelinks") or []
        linked_issues = []
        for link in links:
            other = link.get("outwardIssue") or link.get("inwardIssue")
            if other:
                linked_issues.append(other.get("key", ""))

        return IssuePayload(
            ticket_key=ticket_key,
            source="REST",
            summary=fields.get("summary", "") or "",
            description_text=description_text,
            issue_type=(fields.get("issuetype") or {}).get("name", ""),
            status=(fields.get("status") or {}).get("name", ""),
            priority=(fields.get("priority") or {}).get("name", ""),
            labels=list(fields.get("labels") or []),
            components=[comp.get("name", "") for comp in (fields.get("components") or [])],
            parent=parent.get("key") if parent else None,
            subtasks=[st.get("key", "") for st in subtasks],
            linked_issues=[k for k in linked_issues if k],
            acceptance_criteria_text=acceptance_criteria_text,
            comments=comments,
        )
