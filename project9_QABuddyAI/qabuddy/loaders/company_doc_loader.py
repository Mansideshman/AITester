from __future__ import annotations

from pathlib import Path

from .. import pdf_loader
from .base import Document


def load(folder: Path) -> list[Document]:
    return pdf_loader.load_as_documents(folder)
