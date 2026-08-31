from __future__ import annotations

from pathlib import Path

import pandas as pd

from . import config


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False)


def assemble_docs(df: pd.DataFrame) -> list[dict]:
    """One row -> one document: concatenated text_cols become the embedded
    text, meta_cols are kept as payload for display/filtering."""
    docs = []
    for row_idx, row in df.iterrows():
        parts = []
        for col in config.TEXT_COLS:
            val = str(row.get(col, "") or "").strip()
            if val:
                parts.append(f"{col}: {val}")
        text = "\n".join(parts)
        meta = {col: str(row.get(col, "") or "") for col in config.META_COLS}
        docs.append({"row_index": int(row_idx), "text": text, "meta": meta})
    return docs
