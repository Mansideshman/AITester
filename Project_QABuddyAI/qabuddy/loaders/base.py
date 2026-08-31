from __future__ import annotations

from pathlib import Path
from typing import Iterator, TypedDict

from .. import config
from ..chunking import chunk_text


class Document(TypedDict):
    """Common shape every loader produces, before chunking."""
    source_id: str      # stable id for the parent doc: file path, row id, ticket key...
    title: str           # human-readable citation label
    text: str             # full text to chunk + embed
    meta: dict             # per-source-type payload fields (see ARCHITECTURE.md)


def walk_files(root: Path, extensions: set[str]) -> Iterator[Path]:
    """Recursively yields files under `root` whose suffix (lowercased) is in
    `extensions`. Skips VCS/dependency directories that show up in cloned
    repos and would otherwise be walked pointlessly, and skips `root`'s own
    README.md — that's our folder-documentation stub ("drop PRDs here"),
    not a real document, and would otherwise get ingested as one for any
    .md-matching source (company_doc/prd_doc/meeting_note/lucidchart)."""
    if not root.exists():
        return
    skip_dirs = {".git", "node_modules", "target", "dist", "build", "__pycache__", ".venv"}
    stub_readme = root / "README.md"
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        if any(part in skip_dirs for part in path.parts):
            continue
        if path == stub_readme:
            continue
        if path.suffix.lower() in extensions:
            yield path


def chunk_documents(docs: list[Document], source_type: str) -> list[dict]:
    """Expands Documents into chunk records ready for vectorstore.upsert_chunks,
    using the (size, overlap) tuned for this source_type in config.SOURCE_TYPES."""
    params = config.SOURCE_TYPES[source_type]
    size, overlap = params["chunk_size"], params["chunk_overlap"]

    records = []
    for doc in docs:
        pieces = chunk_text(doc["text"], size=size, overlap=overlap)
        for i, piece in enumerate(pieces):
            records.append({
                "source_type": source_type,
                "source_id": doc["source_id"],
                "chunk_index": i,
                "title": doc["title"],
                "text": piece,
                "meta": doc.get("meta", {}),
            })
    return records
