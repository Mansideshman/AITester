"""Environment-based configuration for the Jira QA Crew pipeline.

Every field maps 1:1 to a variable documented in `.env.example`. Nothing here
reads Streamlit secrets directly -- the UI layer is responsible for merging
`st.secrets` into `os.environ` before calling `load_config()`, so this module
stays framework-agnostic and unit-testable without Streamlit installed.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field

from .exceptions import ConfigError


def _bool(value: str | None, default: bool) -> bool:
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int(value: str | None, default: int) -> int:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _json(value: str | None, default):
    if value is None or value == "":
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


@dataclass(frozen=True)
class Settings:
    app_name: str = "Jira QA Crew"
    app_env: str = "development"
    output_dir: str = "outputs"

    llm_model: str = ""
    llm_api_key: str = ""
    llm_temperature: float = 0.1

    jira_integration_mode: str = "auto"  # auto | mcp | rest
    jira_url: str = ""
    jira_auth_mode: str = "basic"  # basic | bearer
    jira_email: str = ""
    jira_api_token: str = ""
    jira_bearer_token: str = ""
    jira_api_version: str = "3"
    jira_acceptance_criteria_field: str = ""
    jira_include_comments: bool = False
    jira_max_comments: int = 20

    jira_mcp_transport: str = "streamable_http"  # streamable_http | stdio
    jira_mcp_url: str = ""
    jira_mcp_command: str = ""
    jira_mcp_args: list = field(default_factory=list)
    jira_mcp_headers: dict = field(default_factory=dict)
    jira_mcp_get_issue_tool: str = ""
    jira_mcp_timeout_seconds: int = 20

    pipeline_max_tickets: int = 20
    pipeline_max_retries: int = 2
    pipeline_ticket_timeout_seconds: int = 600
    log_level: str = "INFO"
    demo_mode: bool = False

    def require_llm(self) -> None:
        if not self.llm_api_key:
            raise ConfigError("LLM_API_KEY is not set.")
        if not self.llm_model:
            raise ConfigError("LLM_MODEL is not set.")

    def require_jira_live(self) -> None:
        """Validate that at least one live provider is usable for the current mode."""
        if self.demo_mode:
            return
        mcp_ok = bool(self.jira_mcp_url or self.jira_mcp_command)
        rest_ok = bool(self.jira_url)
        if self.jira_integration_mode == "mcp" and not mcp_ok:
            raise ConfigError("JIRA_INTEGRATION_MODE=mcp but no JIRA_MCP_URL/JIRA_MCP_COMMAND set.")
        if self.jira_integration_mode == "rest" and not rest_ok:
            raise ConfigError("JIRA_INTEGRATION_MODE=rest but JIRA_URL is not set.")
        if self.jira_integration_mode == "auto" and not (mcp_ok or rest_ok):
            raise ConfigError("JIRA_INTEGRATION_MODE=auto needs JIRA_URL and/or JIRA_MCP_URL/COMMAND set.")


def load_config(env: dict | None = None) -> Settings:
    """Build Settings from an environment mapping (defaults to os.environ)."""
    src = env if env is not None else os.environ
    return Settings(
        app_name=src.get("APP_NAME", "Jira QA Crew"),
        app_env=src.get("APP_ENV", "development"),
        output_dir=src.get("OUTPUT_DIR", "outputs"),
        llm_model=src.get("LLM_MODEL", ""),
        llm_api_key=src.get("LLM_API_KEY", ""),
        llm_temperature=float(src.get("LLM_TEMPERATURE") or 0.1),
        jira_integration_mode=src.get("JIRA_INTEGRATION_MODE", "auto").strip().lower(),
        jira_url=src.get("JIRA_URL", ""),
        jira_auth_mode=src.get("JIRA_AUTH_MODE", "basic").strip().lower(),
        jira_email=src.get("JIRA_EMAIL", ""),
        jira_api_token=src.get("JIRA_API_TOKEN", ""),
        jira_bearer_token=src.get("JIRA_BEARER_TOKEN", ""),
        jira_api_version=src.get("JIRA_API_VERSION", "3"),
        jira_acceptance_criteria_field=src.get("JIRA_ACCEPTANCE_CRITERIA_FIELD", ""),
        jira_include_comments=_bool(src.get("JIRA_INCLUDE_COMMENTS"), False),
        jira_max_comments=_int(src.get("JIRA_MAX_COMMENTS"), 20),
        jira_mcp_transport=src.get("JIRA_MCP_TRANSPORT", "streamable_http"),
        jira_mcp_url=src.get("JIRA_MCP_URL", ""),
        jira_mcp_command=src.get("JIRA_MCP_COMMAND", ""),
        jira_mcp_args=_json(src.get("JIRA_MCP_ARGS_JSON"), []),
        jira_mcp_headers=_json(src.get("JIRA_MCP_HEADERS_JSON"), {}),
        jira_mcp_get_issue_tool=src.get("JIRA_MCP_GET_ISSUE_TOOL", ""),
        jira_mcp_timeout_seconds=_int(src.get("JIRA_MCP_TIMEOUT_SECONDS"), 20),
        pipeline_max_tickets=_int(src.get("PIPELINE_MAX_TICKETS"), 20),
        pipeline_max_retries=_int(src.get("PIPELINE_MAX_RETRIES"), 2),
        pipeline_ticket_timeout_seconds=_int(src.get("PIPELINE_TICKET_TIMEOUT_SECONDS"), 600),
        log_level=src.get("LOG_LEVEL", "INFO"),
        demo_mode=_bool(src.get("DEMO_MODE"), False),
    )
