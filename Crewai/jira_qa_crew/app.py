"""Jira QA Crew -- Streamlit entrypoint.

Generate test plans, test cases, traceability, and Playwright automation
directly from Jira ticket IDs, via a 4-agent CrewAI pipeline
(Jira Analyst -> Test Plan Writer -> Test Case Writer -> Playwright Coder).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import streamlit as st
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from jira_qa_crew.config import load_config  # noqa: E402
from jira_qa_crew.crew.callbacks import STAGE_ORDER  # noqa: E402
from jira_qa_crew.exceptions import ConfigError, TicketValidationError  # noqa: E402
from jira_qa_crew.services.pipeline import parse_ticket_input, run_pipeline  # noqa: E402
from jira_qa_crew.ui import components, results, state  # noqa: E402

st.set_page_config(page_title="Jira QA Crew", layout="wide")

st.markdown(
    """
    <style>
    .stApp h1 { color: #1a56db; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("Jira QA Crew")
st.caption("Generate test plans, test cases, traceability, and Playwright automation directly from Jira.")

state.init_state()
config = load_config()

try:
    # Streamlit Community Cloud: merge st.secrets over a missing .env when deployed.
    # Accessing st.secrets raises StreamlitSecretNotFoundError when no secrets.toml
    # exists at all (the common case for local/demo use), so this is best-effort.
    has_secrets = bool(st.secrets)
except Exception:
    has_secrets = False

if has_secrets:
    for key in ("LLM_API_KEY", "LLM_MODEL", "GROQ_API_KEY", "GROQ_MODEL", "JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"):
        if key in st.secrets and not os.environ.get(key):
            os.environ[key] = str(st.secrets[key])
    config = load_config()

components.render_config_status(config)

raw_input, mode_override, submitted = components.render_input_area(config)

if submitted:
    valid, invalid = parse_ticket_input(raw_input)
    if invalid:
        st.warning(f"Ignored malformed ticket id(s): {', '.join(invalid)}")

    if not valid:
        st.error("No valid Jira ticket ids found. Expected e.g. VWO-48, or VWO-49, VWO-50.")
    else:
        try:
            config.require_llm()
            if not config.demo_mode:
                config.require_jira_live()
        except ConfigError as exc:
            st.error(f"Configuration error: {exc}")
        else:
            effective_config = load_config({**os.environ, "JIRA_INTEGRATION_MODE": mode_override})
            st.session_state.is_running = True

            progress_placeholders = {ticket: st.empty() for ticket in valid}
            overall = st.progress(0.0, text="Starting…")

            def on_progress(tracker, _seen={"count": 0}):
                snapshot = tracker.snapshot()
                components.render_stage_progress(progress_placeholders[tracker.ticket_key], tracker.ticket_key, snapshot)
                done_stages = sum(1 for s in snapshot if s["status"] in ("completed", "failed"))
                _seen["count"] = max(_seen["count"], done_stages)
                overall.progress(
                    min(1.0, _seen["count"] / (len(STAGE_ORDER) * len(valid))),
                    text=f"Running {tracker.ticket_key}…",
                )

            try:
                summary = run_pipeline(effective_config, raw_input, on_ticket_progress=on_progress)
            except TicketValidationError as exc:
                st.error(str(exc))
            except ConfigError as exc:
                st.error(f"Configuration error: {exc}")
            else:
                overall.progress(1.0, text="Done.")
                state.push_run(summary)
            finally:
                st.session_state.is_running = False

run = state.latest_run()
if run:
    st.divider()
    results.render_run_summary(run)
    ticket_tabs = st.tabs(run.tickets) if run.tickets else []
    for tab, ticket_key in zip(ticket_tabs, run.tickets):
        with tab:
            result = next((r for r in run.results if r.ticket_key == ticket_key), None)
            if result:
                results.render_ticket_tabs(result)
