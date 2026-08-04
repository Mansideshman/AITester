from __future__ import annotations

from pathlib import Path

from .. import docs
from .base import Document, walk_files

TEXT_COLS = ["title", "steps", "expected", "tags", "preconditions"]
META_COLS = ["id", "jira_id", "priority", "module", "test_type", "status"]


def load(folder: Path) -> list[Document]:
    documents: list[Document] = []
    for path in walk_files(folder, {".csv", ".xlsx", ".xls"}):
        df = docs.load_table(path)
        text_cols = [c for c in TEXT_COLS if c in df.columns]
        meta_cols = [c for c in META_COLS if c in df.columns]
        for row_doc in docs.assemble_docs(df, text_cols, meta_cols):
            if not row_doc["text"]:
                continue
            row_id = row_doc["meta"].get("id") or str(row_doc["row_index"])
            title_val = str(df.iloc[row_doc["row_index"]].get("title", "") or "").strip()
            documents.append({
                "source_id": row_id,
                "title": f"Test Case {row_id}: {title_val}" if title_val else f"Test Case {row_id}",
                "text": row_doc["text"],
                "meta": row_doc["meta"],
            })
    return documents
