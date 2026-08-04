from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

from .base import Document, walk_files

# Common TestNG/Maven-Surefire/Jenkins console markers that start a new
# per-test block in a raw console log.
_MARKER_RE = re.compile(
    r"^(?:\[TestNG\]\s*)?(?:Starting test:|Test set:|Tests run:|RUNNING:|PASSED:|FAILED:|SKIPPED:)",
    re.MULTILINE,
)


def _job_and_build(path: Path, folder: Path) -> tuple[str, str | None]:
    rel_parent = path.relative_to(folder).parent
    job_name = str(rel_parent) if str(rel_parent) != "." else path.stem
    build_match = re.search(r"(\d+)", path.stem)
    return job_name, build_match.group(1) if build_match else None


def _load_junit_xml(path: Path, folder: Path) -> list[Document]:
    job_name, build_id = _job_and_build(path, folder)
    try:
        root = ET.parse(str(path)).getroot()
    except ET.ParseError:
        return []

    documents: list[Document] = []
    for i, tc in enumerate(root.iter("testcase")):
        name = tc.get("name", f"test_{i}")
        classname = tc.get("classname", "")
        failure = tc.find("failure")
        error = tc.find("error")
        skipped = tc.find("skipped")
        if failure is not None:
            status, detail = "failed", (failure.get("message") or "") + "\n" + (failure.text or "")
        elif error is not None:
            status, detail = "error", (error.get("message") or "") + "\n" + (error.text or "")
        elif skipped is not None:
            status, detail = "skipped", ""
        else:
            status, detail = "passed", ""

        text = f"{classname}.{name} — {status}\n{detail.strip()}".strip()
        documents.append({
            "source_id": f"{path.name}::{classname}.{name}#{i}",
            "title": f"{job_name} :: {classname}.{name} {status.upper()}",
            "text": text,
            "meta": {"job_name": job_name, "build_id": build_id, "test_name": f"{classname}.{name}", "status": status},
        })
    return documents


def _load_console_log(path: Path, folder: Path) -> list[Document]:
    job_name, build_id = _job_and_build(path, folder)
    text = path.read_text(encoding="utf-8", errors="replace")
    if not text.strip():
        return []

    starts = [m.start() for m in _MARKER_RE.finditer(text)]
    if not starts:
        # No recognizable markers — hand the whole file to the generic
        # sliding-window chunker via base.chunk_documents.
        return [{
            "source_id": path.name,
            "title": f"{job_name} console log",
            "text": text,
            "meta": {"job_name": job_name, "build_id": build_id, "test_name": None, "status": None},
        }]

    starts.append(len(text))
    documents: list[Document] = []
    for i in range(len(starts) - 1):
        block = text[starts[i]:starts[i + 1]].strip()
        if not block:
            continue
        first_line = block.splitlines()[0][:120]
        documents.append({
            "source_id": f"{path.name}#{i}",
            "title": f"{job_name} :: {first_line}",
            "text": block,
            "meta": {"job_name": job_name, "build_id": build_id, "test_name": first_line, "status": None},
        })
    return documents


def load(folder: Path) -> list[Document]:
    documents: list[Document] = []
    for path in walk_files(folder, {".xml"}):
        documents.extend(_load_junit_xml(path, folder))
    for path in walk_files(folder, {".log", ".txt"}):
        documents.extend(_load_console_log(path, folder))
    return documents
