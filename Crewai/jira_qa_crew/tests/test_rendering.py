import pytest

from jira_qa_crew.exceptions import ArtifactError
from jira_qa_crew.models import PlaywrightFile, TestCase, TestCaseSuite, TestPlan
from jira_qa_crew.services import artifacts


def test_sanitize_path_segment_passes_through_safe_names():
    assert artifacts.sanitize_path_segment("VWO-48") == "VWO-48"


def test_sanitize_path_segment_replaces_unsafe_chars():
    assert artifacts.sanitize_path_segment("weird name!") == "weird-name"


def test_sanitize_path_segment_rejects_traversal():
    with pytest.raises(ArtifactError):
        artifacts.sanitize_path_segment("..")
    with pytest.raises(ArtifactError):
        artifacts.sanitize_path_segment("")


def test_render_test_plan_markdown_includes_all_sections():
    plan = TestPlan(ticket_key="X-1", sections={"executive_summary": "Summary body"})
    md = artifacts.render_test_plan_markdown(plan)
    assert "# Test Plan: X-1" in md
    assert "Summary body" in md
    assert "Entry and Exit Criteria" in md  # a section with no content still gets a heading


def test_render_test_cases_csv_round_trips_basic_fields():
    suite = TestCaseSuite(
        ticket_key="X-1",
        test_cases=[
            TestCase(
                id="X-1-TC-001", ticket_key="X-1", title="Discount applies",
                objective="o", steps=["step 1", "step 2"], expected_result="total correct",
            )
        ],
    )
    csv_text = artifacts.render_test_cases_csv(suite)
    assert "X-1-TC-001" in csv_text
    assert "Discount applies" in csv_text
    assert "step 1 | step 2" in csv_text


def test_write_ticket_artifacts_creates_expected_tree(tmp_path):
    bundle_file = PlaywrightFile(path="tests/x1.spec.ts", content="test('x', async () => {});")
    ticket_dir = artifacts.write_ticket_artifacts(
        tmp_path,
        "RUN-1",
        "X-1",
        requirement_analysis_json="{}",
        test_plan_md="# plan",
        test_cases_md="# cases",
        test_cases_csv="id\n",
        traceability_csv="requirement_id\n",
        playwright_md="# pw",
        playwright_files=[bundle_file],
    )
    assert ticket_dir == tmp_path / "RUN-1" / "X-1"
    assert (ticket_dir / "test_plan.md").read_text() == "# plan"
    assert (ticket_dir / "playwright" / "tests" / "x1.spec.ts").exists()


def test_write_ticket_artifacts_rejects_path_traversal_in_playwright_file(tmp_path):
    malicious = PlaywrightFile(path="../../evil.spec.ts", content="oops")
    with pytest.raises(ArtifactError):
        artifacts.write_ticket_artifacts(
            tmp_path,
            "RUN-1",
            "X-1",
            requirement_analysis_json="{}",
            test_plan_md="",
            test_cases_md="",
            test_cases_csv="",
            traceability_csv="",
            playwright_md="",
            playwright_files=[malicious],
        )


def test_build_run_zip_contains_written_files(tmp_path):
    artifacts.write_ticket_artifacts(
        tmp_path,
        "RUN-1",
        "X-1",
        requirement_analysis_json="{}",
        test_plan_md="# plan",
        test_cases_md="",
        test_cases_csv="",
        traceability_csv="",
        playwright_md="",
        playwright_files=[],
    )
    run_dir = tmp_path / "RUN-1"
    (run_dir / "manifest.json").write_text("{}")

    zip_bytes = artifacts.build_run_zip(run_dir)
    assert zip_bytes[:2] == b"PK"

    import zipfile
    import io

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
    assert "X-1/test_plan.md" in names
    assert "manifest.json" in names
