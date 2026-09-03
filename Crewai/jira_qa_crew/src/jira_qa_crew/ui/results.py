"""Renders one ticket's results: 6 tabs + downloads, plus the run-level ZIP."""

from __future__ import annotations

import streamlit as st

from ..models import RunSummary, TicketRunResult
from ..services import artifacts


def render_run_summary(summary: RunSummary) -> None:
    st.subheader(f"Run {summary.run_id}")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Tickets", len(summary.tickets))
    c2.metric("Completed", summary.completed)
    c3.metric("With warnings", summary.completed_with_warnings)
    c4.metric("Failed", summary.failed)

    run_dir = None
    for result in summary.results:
        if result.artifact_dir:
            run_dir = str(result.artifact_dir).rsplit("/", 1)[0]
            break
    if run_dir:
        try:
            from pathlib import Path

            zip_bytes = artifacts.build_run_zip(Path(run_dir))
            st.download_button(
                "Download all artifacts (ZIP)",
                data=zip_bytes,
                file_name=f"{summary.run_id}.zip",
                mime="application/zip",
            )
        except Exception as exc:  # noqa: BLE001 - zip download is best-effort, never block the page
            st.caption(f"ZIP unavailable: {exc}")


def render_ticket_tabs(result: TicketRunResult) -> None:
    st.markdown(f"### {result.ticket_key} — `{result.status}`" + (f" (source: {result.source})" if result.source else ""))

    if result.errors:
        for err in result.errors:
            st.error(err)
        return

    if result.warnings:
        with st.expander(f"{len(result.warnings)} warning(s)", expanded=False):
            for w in result.warnings:
                st.warning(w)

    tabs = st.tabs(
        ["Requirements Analysis", "Test Plan", "Test Cases", "Playwright", "Traceability", "Run Details"]
    )

    with tabs[0]:
        _render_requirements(result)
    with tabs[1]:
        _render_test_plan(result)
    with tabs[2]:
        _render_test_cases(result)
    with tabs[3]:
        _render_playwright(result)
    with tabs[4]:
        _render_traceability(result)
    with tabs[5]:
        _render_run_details(result)


def _render_requirements(result: TicketRunResult) -> None:
    ra = result.requirement_analysis
    if not ra:
        st.info("Not available.")
        return
    st.write(f"**Summary**: {ra.summary}")
    st.write(f"**Type / Status / Priority**: {ra.issue_type} / {ra.status} / {ra.priority}")
    st.markdown("**Description**")
    st.markdown(ra.description or "_none_")

    st.markdown("**Requirements**")
    for r in ra.requirements:
        st.markdown(f"- `{r.id}` ({r.source}) {r.text}")
    st.markdown("**Acceptance Criteria**")
    for ac in ra.acceptance_criteria:
        st.markdown(f"- `{ac.id}` ({ac.source}) {ac.text}")

    if ra.missing_information:
        st.markdown("**Missing information**")
        for m in ra.missing_information:
            st.markdown(f"- {m}")
    if ra.open_questions:
        st.markdown("**Open questions**")
        for q in ra.open_questions:
            st.markdown(f"- {q}")

    st.download_button(
        "Download requirements_analysis.json",
        data=ra.model_dump_json(indent=2),
        file_name=f"{result.ticket_key}_requirements_analysis.json",
        mime="application/json",
        key=f"dl_ra_{result.ticket_key}",
    )


def _render_test_plan(result: TicketRunResult) -> None:
    if not result.test_plan:
        st.info("Not available.")
        return
    md = artifacts.render_test_plan_markdown(result.test_plan)
    st.markdown(md)
    st.download_button(
        "Download test_plan.md", data=md, file_name=f"{result.ticket_key}_test_plan.md",
        mime="text/markdown", key=f"dl_plan_{result.ticket_key}",
    )


def _render_test_cases(result: TicketRunResult) -> None:
    suite = result.test_case_suite
    if not suite or not suite.test_cases:
        st.info("Not available.")
        return

    priorities = sorted({c.priority for c in suite.test_cases})
    types = sorted({c.test_type for c in suite.test_cases if c.test_type})
    candidates = sorted({c.automation_candidate for c in suite.test_cases})

    c1, c2, c3 = st.columns(3)
    priority_filter = c1.multiselect("Priority", priorities, default=priorities, key=f"f_prio_{result.ticket_key}")
    type_filter = c2.multiselect("Test type", types, default=types, key=f"f_type_{result.ticket_key}")
    automation_filter = c3.multiselect(
        "Automation candidate", candidates, default=candidates, key=f"f_auto_{result.ticket_key}"
    )
    req_query = st.text_input("Filter by requirement/AC id contains", key=f"f_req_{result.ticket_key}")
    tag_query = st.text_input("Filter by tag contains", key=f"f_tag_{result.ticket_key}")

    rows = []
    for c in suite.test_cases:
        if c.priority not in priority_filter:
            continue
        if types and c.test_type not in type_filter:
            continue
        if c.automation_candidate not in automation_filter:
            continue
        if req_query and req_query.upper() not in " ".join(c.requirement_refs + c.acceptance_criteria_refs).upper():
            continue
        if tag_query and tag_query.lower() not in " ".join(c.tags).lower():
            continue
        rows.append(
            {
                "id": c.id,
                "title": c.title,
                "priority": c.priority,
                "type": c.test_type,
                "requirements": ", ".join(c.requirement_refs),
                "acceptance_criteria": ", ".join(c.acceptance_criteria_refs),
                "automation": c.automation_candidate,
                "tags": ", ".join(c.tags),
            }
        )

    st.dataframe(rows, use_container_width=True)

    csv_data = artifacts.render_test_cases_csv(suite)
    md_data = artifacts.render_test_cases_markdown(suite)
    c1, c2 = st.columns(2)
    c1.download_button(
        "Download test_cases.csv", data=csv_data, file_name=f"{result.ticket_key}_test_cases.csv",
        mime="text/csv", key=f"dl_tc_csv_{result.ticket_key}",
    )
    c2.download_button(
        "Download test_cases.md", data=md_data, file_name=f"{result.ticket_key}_test_cases.md",
        mime="text/markdown", key=f"dl_tc_md_{result.ticket_key}",
    )


def _render_playwright(result: TicketRunResult) -> None:
    bundle = result.playwright_bundle
    if not bundle:
        st.info("Not available.")
        return
    st.write(f"**Readiness**: `{bundle.readiness}`")
    if bundle.notes:
        st.info(bundle.notes)
    for file in bundle.files:
        with st.expander(file.path, expanded=False):
            st.code(file.content, language="typescript")

    md = artifacts.render_playwright_markdown(bundle)
    st.download_button(
        "Download playwright_tests.md", data=md, file_name=f"{result.ticket_key}_playwright_tests.md",
        mime="text/markdown", key=f"dl_pw_{result.ticket_key}",
    )


def _render_traceability(result: TicketRunResult) -> None:
    if not result.traceability:
        st.info("Not available.")
        return
    if result.coverage:
        st.metric("Coverage", f"{result.coverage.coverage_percent}%")
        if result.coverage.orphan_requirements:
            st.warning(f"Orphan requirements (no test case): {', '.join(result.coverage.orphan_requirements)}")
        if result.coverage.orphan_test_cases:
            st.warning(f"Orphan test cases (no requirement link): {', '.join(result.coverage.orphan_test_cases)}")

    rows = [
        {
            "requirement": row.requirement_id,
            "acceptance_criterion": row.acceptance_criterion_id or "",
            "test_cases": ", ".join(row.test_case_ids),
            "automated": ", ".join(row.automated_test_ids),
            "status": row.coverage_status,
            "reason": row.reason,
        }
        for row in result.traceability
    ]
    st.dataframe(rows, use_container_width=True)

    csv_data = artifacts.render_traceability_csv(result.traceability)
    st.download_button(
        "Download traceability_matrix.csv", data=csv_data, file_name=f"{result.ticket_key}_traceability_matrix.csv",
        mime="text/csv", key=f"dl_trace_{result.ticket_key}",
    )


def _render_run_details(result: TicketRunResult) -> None:
    st.write(f"**Status**: {result.status}")
    st.write(f"**Source**: {result.source or 'n/a'}")
    st.write(f"**Started**: {result.started_at}")
    st.write(f"**Completed**: {result.completed_at}")
    st.write(f"**Artifact directory**: `{result.artifact_dir or 'n/a'}`")
    if result.warnings:
        st.write("**Warnings**")
        for w in result.warnings:
            st.write(f"- {w}")
