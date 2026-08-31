from __future__ import annotations

import re
from pathlib import Path

from .base import Document, walk_files

_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def load(folder: Path) -> list[Document]:
    documents: list[Document] = []
    for path in walk_files(folder, {".txt", ".md"}):
        text = path.read_text(encoding="utf-8", errors="replace").strip()
        if not text:
            continue
        date_match = _DATE_RE.search(path.name)
        documents.append({
            "source_id": path.name,
            "title": path.stem,
            "text": text,
            "meta": {"doc_name": path.name, "meeting_date": date_match.group(1) if date_match else None},
        })
    return documents
