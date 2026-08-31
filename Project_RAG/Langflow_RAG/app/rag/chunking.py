from __future__ import annotations

from . import config


def chunk_text(text: str, size: int = None, overlap: int = None) -> list[str]:
    """1 row = 1 chunk if it already fits (true for nearly all VWO test
    cases); otherwise a sliding window split on whitespace, matching the
    exported flow's SplitText component."""
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
            snap = text.rfind(" ", start, end)
            if snap > start:
                end = snap
        chunks.append(text[start:end].strip())
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return [c for c in chunks if c]


def chunk_docs(docs: list[dict]) -> list[dict]:
    chunk_records = []
    chunk_id = 0
    for doc in docs:
        for piece in chunk_text(doc["text"]):
            chunk_records.append({
                "chunk_id": chunk_id,
                "row_index": doc["row_index"],
                "text": piece,
                "meta": doc["meta"],
            })
            chunk_id += 1
    return chunk_records
