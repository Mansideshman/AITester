from __future__ import annotations

from pathlib import Path

from .base import Document, walk_files


def load(folder: Path) -> list[Document]:
    documents: list[Document] = []
    for path in walk_files(folder, {".txt", ".md"}):
        text = path.read_text(encoding="utf-8", errors="replace").strip()
        if not text:
            continue
        documents.append({
            "source_id": path.name,
            "title": path.stem,
            "text": text,
            "meta": {"doc_name": path.name, "diagram_name": path.stem},
        })
    return documents
