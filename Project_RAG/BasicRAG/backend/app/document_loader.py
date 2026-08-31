from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import TypedDict

from pypdf import PdfReader

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".doc", ".docx"}


class PageText(TypedDict):
    page: int
    text: str


class UnsupportedDocumentError(ValueError):
    pass


def _load_pdf(path: Path) -> list[PageText]:
    reader = PdfReader(str(path))
    return [{"page": i + 1, "text": page.extract_text() or ""} for i, page in enumerate(reader.pages)]


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
                [
                    "soffice",
                    "--headless",
                    "--convert-to",
                    "txt:Text",
                    "--outdir",
                    tmp_dir,
                    str(path),
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
        except FileNotFoundError as exc:
            raise UnsupportedDocumentError(
                "'.doc' files require LibreOffice ('soffice' on PATH), which isn't available in "
                "this deployment. Convert to .docx/.pdf/.txt first, or run this app locally."
            ) from exc
        if result.returncode != 0:
            raise RuntimeError(f"Failed to convert .doc file: {result.stderr or result.stdout}")

        out_path = Path(tmp_dir) / (path.stem + ".txt")
        if not out_path.exists():
            raise RuntimeError("LibreOffice did not produce the expected .txt output")

        text = out_path.read_text(encoding="utf-8", errors="replace").lstrip("﻿")
        return [{"page": 1, "text": text}]


def load_document_pages(path: Path) -> list[PageText]:
    if not path.exists():
        raise FileNotFoundError(f"Document not found at {path}")

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _load_pdf(path)
    if suffix in (".txt", ".md"):
        return _load_plain_text(path)
    if suffix == ".docx":
        return _load_docx(path)
    if suffix == ".doc":
        return _load_doc_via_libreoffice(path)

    raise UnsupportedDocumentError(
        f"Unsupported file type '{suffix}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
    )
