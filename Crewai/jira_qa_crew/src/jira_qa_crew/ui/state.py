"""Streamlit session_state helpers.

Keeps `RunSummary` objects (Pydantic, so trivially picklable/JSON-able) in
session_state so completed results survive normal Streamlit reruns instead
of being recomputed on every widget interaction.
"""

from __future__ import annotations

import streamlit as st

from ..models import RunSummary


def init_state() -> None:
    st.session_state.setdefault("runs", [])  # list[RunSummary], most recent last
    st.session_state.setdefault("integration_mode_override", "auto")
    st.session_state.setdefault("is_running", False)


def push_run(summary: RunSummary) -> None:
    st.session_state.runs.append(summary)


def latest_run() -> RunSummary | None:
    runs = st.session_state.get("runs") or []
    return runs[-1] if runs else None
