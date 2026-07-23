from __future__ import annotations

from pathlib import Path
from typing import TypedDict

from pypdf import PdfReader


class PageText(TypedDict):
    page: int
    text: str


def load_pdf_pages(pdf_path: Path) -> list[PageText]:
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found at {pdf_path}")

    reader = PdfReader(str(pdf_path))
    pages: list[PageText] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({"page": i + 1, "text": text})
    return pages
