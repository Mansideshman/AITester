from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path
from typing import TypedDict

from pypdf import PdfReader

from .loaders.base import Document, walk_files

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".doc", ".docx"}


class PageText(TypedDict):
    page: int
    text: str


class UnsupportedDocumentError(ValueError):
    pass


def _normalize_pdf_text(text: str) -> str:
    """pypdf's extraction breaks lines at the PDF's internal layout (column
    widths, hyphenation, headers/footers), not at sentence/paragraph
    boundaries — collapsing whitespace runs to a single space turns that
    back into normal prose. Only applied to PDF extraction: .txt/.md/.docx
    already come out clean, and collapsing them would flatten markdown
    structure (lists, headings) that's worth keeping.
    """
    return re.sub(r"\s+", " ", text).strip()


def _load_pdf(path: Path) -> list[PageText]:
    reader = PdfReader(str(path))
    return [{"page": i + 1, "text": _normalize_pdf_text(page.extract_text() or "")} for i, page in enumerate(reader.pages)]


def _load_plain_text(path: Path) -> list[PageText]:
    text = path.read_text(encoding="utf-8", errors="replace")
    return [{"page": 1, "text": text}]


def _load_docx(path: Path) -> list[PageText]:
    import docx  # python-docx

    doc = docx.Document(str(path))
    text = "\n".join(p.text for p in doc.paragraphs)
    return [{"page": 1, "text": text}]


def _load_doc_via_libreoffice(path: Path) -> list[PageText]:
    with tempfile.TemporaryDirectory() as tmp_dir:
        try:
            result = subprocess.run(
                ["soffice", "--headless", "--convert-to", "txt:Text", "--outdir", tmp_dir, str(path)],
                capture_output=True,
                text=True,
                timeout=60,
            )
        except FileNotFoundError as exc:
            raise UnsupportedDocumentError(
                "'.doc' files require LibreOffice ('soffice' on PATH), which isn't available here. "
                "Convert to .docx/.pdf/.txt first."
            ) from exc
        if result.returncode != 0:
            raise RuntimeError(f"Failed to convert .doc file: {result.stderr or result.stdout}")

        out_path = Path(tmp_dir) / (path.stem + ".txt")
        if not out_path.exists():
            raise RuntimeError("LibreOffice did not produce the expected .txt output")

        text = out_path.read_text(encoding="utf-8", errors="replace").lstrip("﻿")
        return [{"page": 1, "text": text}]


def load_document_pages(path: Path) -> list[PageText]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _load_pdf(path)
    if suffix in (".txt", ".md"):
        return _load_plain_text(path)
    if suffix == ".docx":
        return _load_docx(path)
    if suffix == ".doc":
        return _load_doc_via_libreoffice(path)
    raise UnsupportedDocumentError(f"Unsupported file type '{suffix}'")


def load_as_documents(folder: Path) -> list[Document]:
    """Walks `folder` for SUPPORTED_EXTENSIONS files and returns one Document
    per page (PDF) or per file (everything else), ready for base.chunk_documents.
    Skips individual files that fail to load instead of aborting the whole scan."""
    documents: list[Document] = []
    for path in walk_files(folder, SUPPORTED_EXTENSIONS):
        try:
            pages = load_document_pages(path)
        except (UnsupportedDocumentError, RuntimeError):
            continue
        for page in pages:
            text = page["text"].strip()
            if not text:
                continue
            documents.append({
                "source_id": f"{path.name}#p{page['page']}",
                "title": f"{path.name} p.{page['page']}" if len(pages) > 1 else path.name,
                "text": text,
                "meta": {"doc_name": path.name, "page": page["page"]},
            })
    return documents
