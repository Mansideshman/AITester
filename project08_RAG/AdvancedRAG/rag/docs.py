from __future__ import annotations

from pathlib import Path

import pandas as pd


def load_table(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path, dtype=str, keep_default_na=False)
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(path, dtype=str)
    raise ValueError(f"Unsupported file type: {suffix}")


def preview(df: pd.DataFrame, n: int = 5) -> dict:
    return {
        "row_count": len(df),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "sample_rows": df.head(n).fillna("").to_dict(orient="records"),
    }


def assemble_docs(df: pd.DataFrame, text_cols: list[str], meta_cols: list[str]) -> list[dict]:
    """One row -> one document: concatenated text_cols become the embedded
    text, meta_cols are kept as Qdrant payload for filtering."""
    docs = []
    for row_idx, row in df.iterrows():
        parts = []
        for col in text_cols:
            val = str(row.get(col, "") or "").strip()
            if val:
                parts.append(f"{col}: {val}")
        text = "\n".join(parts)
        meta = {col: str(row.get(col, "") or "") for col in meta_cols}
        docs.append({"row_index": int(row_idx), "text": text, "meta": meta})
    return docs
