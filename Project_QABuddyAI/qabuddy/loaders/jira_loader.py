# TODO: replace this file-based loader with a live MCP/JQL pull once the
# JIRA connection is shared (see project9_QABuddyAI/prompt.md) — phase 2.
from __future__ import annotations

import json
from pathlib import Path

from .. import docs
from .base import Document, walk_files

CSV_TEXT_COLS = ["summary", "description", "comments"]


def _field(fields: dict, name: str, default=""):
    val = fields.get(name, default)
    if isinstance(val, dict):
        return val.get("name") or val.get("displayName") or default
    return val if val is not None else default


def _issue_to_document(key: str, fields: dict) -> Document | None:
    summary = _field(fields, "summary")
    description = _field(fields, "description")
    comments = fields.get("comment", {}).get("comments", []) if isinstance(fields.get("comment"), dict) else []
    comment_text = "\n".join(c.get("body", "") for c in comments if isinstance(c, dict))

    parts = [p for p in [f"summary: {summary}", f"description: {description}", f"comments: {comment_text}"] if p.split(": ", 1)[1]]
    text = "\n".join(parts)
    if not text:
        return None

    return {
        "source_id": key,
        "title": f"{key}: {summary}" if summary else key,
        "text": text,
        "meta": {
            "jira_id": key,
            "status": _field(fields, "status"),
            "issue_type": _field(fields, "issuetype"),
            "priority": _field(fields, "priority"),
            "assignee": _field(fields, "assignee"),
            "created_date": _field(fields, "created"),
            "updated_date": _field(fields, "updated"),
        },
    }


def _load_json(path: Path) -> list[Document]:
    data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    issues = data.get("issues", data) if isinstance(data, dict) else data
    if not isinstance(issues, list):
        return []

    documents = []
    for issue in issues:
        key = issue.get("key") or issue.get("id")
        fields = issue.get("fields", issue)
        if not key:
            continue
        doc = _issue_to_document(key, fields)
        if doc:
            documents.append(doc)
    return documents


def _load_csv(path: Path) -> list[Document]:
    df = docs.load_table(path)
    cols = {c.lower(): c for c in df.columns}
    key_col = cols.get("key") or cols.get("jira_id") or cols.get("id")
    if not key_col:
        return []

    text_cols = [cols[c] for c in CSV_TEXT_COLS if c in cols]
    documents = []
    for row_doc in docs.assemble_docs(df, text_cols, [key_col]):
        row = df.iloc[row_doc["row_index"]]
        key = str(row.get(key_col, "") or "").strip()
        if not key or not row_doc["text"]:
            continue
        summary = str(row.get(cols.get("summary", ""), "") or "").strip()
        documents.append({
            "source_id": key,
            "title": f"{key}: {summary}" if summary else key,
            "text": row_doc["text"],
            "meta": {
                "jira_id": key,
                "status": str(row.get(cols.get("status", ""), "") or ""),
                "issue_type": str(row.get(cols.get("issuetype", ""), "") or ""),
                "priority": str(row.get(cols.get("priority", ""), "") or ""),
                "assignee": str(row.get(cols.get("assignee", ""), "") or ""),
                "created_date": str(row.get(cols.get("created", ""), "") or ""),
                "updated_date": str(row.get(cols.get("updated", ""), "") or ""),
            },
        })
    return documents


def load(folder: Path) -> list[Document]:
    documents: list[Document] = []
    for path in walk_files(folder, {".json"}):
        documents.extend(_load_json(path))
    for path in walk_files(folder, {".csv"}):
        documents.extend(_load_csv(path))
    return documents
