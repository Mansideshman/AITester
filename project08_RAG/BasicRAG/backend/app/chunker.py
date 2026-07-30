from __future__ import annotations

import re
from typing import TypedDict

from .document_loader import PageText


class Chunk(TypedDict):
    id: str
    chunk_index: int
    page: int
    text: str
    char_count: int


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _split_with_overlap(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Greedy fixed-size splitter that prefers breaking on sentence/word
    boundaries near the target size, then backs up by `overlap` characters
    so consecutive chunks share context."""
    if len(text) <= chunk_size:
        return [text] if text else []

    pieces: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_size, n)
        if end < n:
            window_start = max(start + int(chunk_size * 0.5), start)
            boundary = -1
            for match in re.finditer(r"[.!?]\s", text[window_start:end]):
                boundary = window_start + match.end()
            if boundary == -1:
                space = text.rfind(" ", window_start, end)
                boundary = space if space != -1 else end
            end = boundary if boundary > start else end

        piece = text[start:end].strip()
        if piece:
            pieces.append(piece)

        if end >= n:
            break
        start = max(end - overlap, start + 1)

    return pieces


def chunk_pages(pages: list[PageText], chunk_size: int, overlap: int) -> list[Chunk]:
    chunks: list[Chunk] = []
    idx = 0
    for page in pages:
        text = _normalize_whitespace(page["text"])
        if not text:
            continue
        for piece in _split_with_overlap(text, chunk_size, overlap):
            chunks.append(
                {
                    "id": f"chunk-{idx}",
                    "chunk_index": idx,
                    "page": page["page"],
                    "text": piece,
                    "char_count": len(piece),
                }
            )
            idx += 1
    return chunks
