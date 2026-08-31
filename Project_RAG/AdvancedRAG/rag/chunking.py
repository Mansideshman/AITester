from __future__ import annotations

from . import config


def chunk_text(text: str, size: int = None, overlap: int = None) -> list[str]:
    """1 row = 1 chunk if it already fits; otherwise a sliding window split
    on whitespace boundaries with a char overlap between adjacent chunks."""
    size = size or config.CHUNK_SIZE
    overlap = overlap or config.CHUNK_OVERLAP
    text = text.strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]

    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        if end < n:
            # snap to the nearest preceding whitespace so we don't cut mid-word
            snap = text.rfind(" ", start, end)
            if snap > start:
                end = snap
        chunks.append(text[start:end].strip())
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return [c for c in chunks if c]


def chunk_docs(docs: list[dict]) -> list[dict]:
    """Expand assembled row-docs into chunk records, preserving row metadata
    and tracking overlap spans for UI highlighting."""
    chunk_records = []
    chunk_id = 0
    for doc in docs:
        pieces = chunk_text(doc["text"])
        for i, piece in enumerate(pieces):
            chunk_records.append({
                "chunk_id": chunk_id,
                "row_index": doc["row_index"],
                "chunk_index_in_row": i,
                "text": piece,
                "meta": doc["meta"],
            })
            chunk_id += 1
    return chunk_records
