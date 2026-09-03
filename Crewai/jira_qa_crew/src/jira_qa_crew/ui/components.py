"""Reusable Streamlit widgets: input area, config status, live stage progress."""

from __future__ import annotations

import streamlit as st

from ..config import Settings

_STATUS_ICON = {"pending": "⏳", "running": "🔄", "completed": "✅", "failed": "❌"}


def render_config_status(config: Settings) -> None:
    with st.expander("Configuration readiness", expanded=False):
        llm_ok = bool(config.llm_api_key and config.llm_model)
        st.write(f"{'✅' if llm_ok else '❌'} LLM: model=`{config.llm_model or 'unset'}`, "
                 f"api_key={'set' if config.llm_api_key else 'MISSING'}")

        if config.demo_mode:
            st.write("🧪 DEMO_MODE is on — Jira fixtures are used instead of live MCP/REST.")
        else:
            mcp_ok = bool(config.jira_mcp_url or config.jira_mcp_command)
            rest_ok = bool(config.jira_url)
            st.write(f"{'✅' if mcp_ok else '⬜'} Jira MCP: "
                     f"{'configured' if mcp_ok else 'not configured'} "
                     f"(`{config.jira_mcp_transport}`)")
            st.write(f"{'✅' if rest_ok else '⬜'} Jira REST: "
                     f"{'configured — ' + config.jira_url if rest_ok else 'not configured'}")
            st.write(f"Integration mode: `{config.jira_integration_mode}`")


def render_input_area(config: Settings) -> tuple[str, str, bool]:
    st.subheader("Input")
    raw = st.text_area(
        "Jira ticket IDs (comma, space, newline, or semicolon separated)",
        placeholder="VWO-48\nVWO-49, VWO-50",
        height=100,
        key="ticket_input",
    )
    mode = st.selectbox(
        "Integration mode",
        options=["auto", "mcp", "rest"],
        index=["auto", "mcp", "rest"].index(config.jira_integration_mode)
        if config.jira_integration_mode in ("auto", "mcp", "rest")
        else 0,
        help="auto tries MCP first and falls back to REST. Ignored when DEMO_MODE is on.",
    )
    submitted = st.button("Analyze & Generate QA Pack", type="primary", disabled=st.session_state.get("is_running", False))
    return raw, mode, submitted


def render_stage_progress(placeholder, ticket_key: str, snapshot: list[dict]) -> None:
    with placeholder.container():
        st.markdown(f"**{ticket_key}**")
        cols = st.columns(len(snapshot))
        for col, stage in zip(cols, snapshot):
            icon = _STATUS_ICON.get(stage["status"], "⬜")
            col.markdown(f"{icon}  {stage['title']}")
