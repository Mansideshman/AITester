from __future__ import annotations


def chunk_text(text: str, size: int = 1000, overlap: int = 150) -> list[str]:
    """Sliding-window split on whitespace boundaries with a char overlap
    between adjacent chunks. 1 doc = 1 chunk if it already fits `size`.

    Source-agnostic: any loader can call this directly with its own
    per-source-type (size, overlap), see config.CHUNK_PARAMS.
    """
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
