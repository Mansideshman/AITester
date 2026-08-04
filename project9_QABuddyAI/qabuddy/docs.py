from __future__ import annotations

import re
from pathlib import Path

import pandas as pd


def load_table(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path, dtype=str, keep_default_na=False)
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(path, dtype=str)
    raise ValueError(f"Unsupported file type: {suffix}")


def _normalize_cell(value: str) -> str:
    """Collapses embedded newlines/whitespace runs in one CSV/XLSX cell to a
    single space, so a multi-line cell (e.g. a "steps" field with literal
    newlines) can't be mistaken for a new "col: value" line in the
    assembled text below."""
    return re.sub(r"\s+", " ", value).strip()


def assemble_docs(df: pd.DataFrame, text_cols: list[str], meta_cols: list[str]) -> list[dict]:
    """One row -> one document: concatenated text_cols become the embedded
    text, meta_cols are kept as payload for filtering."""
    docs = []
    for row_idx, row in df.iterrows():
        parts = []
        for col in text_cols:
            val = _normalize_cell(str(row.get(col, "") or ""))
            if val:
                parts.append(f"{col}: {val}")
        text = "\n".join(parts)
        meta = {col: _normalize_cell(str(row.get(col, "") or "")) for col in meta_cols}
        docs.append({"row_index": int(row_idx), "text": text, "meta": meta})
    return docs
