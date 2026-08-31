"""Ingestion orchestrator: scans data/<folder> for one or all source_types,
dispatches to the matching loader, chunks, embeds, and indexes into Qdrant.

CLI usage:
    python ingest.py                 # ingest every source_type
    python ingest.py test_case       # ingest just one
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from . import config, embeddings, vectorstore
from .loaders import LOADERS

STATE_PATH = Path(config.QDRANT_PATH) / "ingest_state.json"


def _load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {}


def _save_state(source_type: str, chunk_count: int):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    state = _load_state()
    state[source_type] = {
        "last_ingested_at": datetime.now(timezone.utc).isoformat(),
        "chunk_count": chunk_count,
    }
    STATE_PATH.write_text(json.dumps(state, indent=2))


def get_state() -> dict:
    return _load_state()


def ingest_source_stream(source_type: str) -> Iterator[dict]:
    """Generator of {"stage": ..., **detail} progress events, suitable for
    driving a CLI printer or an SSE response."""
    if source_type not in LOADERS:
        yield {"stage": "error", "source_type": source_type, "message": f"Unknown or unimplemented source_type '{source_type}'"}
        return

    folder = config.DATA_DIR / config.SOURCE_TYPES[source_type]["folder"]
    yield {"stage": "read", "source_type": source_type, "folder": str(folder)}
    documents = LOADERS[source_type](folder)
    yield {"stage": "build", "source_type": source_type, "document_count": len(documents)}

    if not documents:
        # Still clear any chunks from a previous ingest — the folder may have
        # gone from non-empty to empty (files removed), and a stale prior
        # source_type shouldn't survive as an orphaned entry.
        vectorstore.ensure_collection()
        vectorstore.delete_source_type(source_type)
        _save_state(source_type, 0)
        yield {"stage": "done", "source_type": source_type, "chunk_count": 0}
        return

    from .loaders.base import chunk_documents
    chunk_records = chunk_documents(documents, source_type)
    yield {"stage": "chunk", "source_type": source_type, "chunk_count": len(chunk_records)}

    vectorstore.ensure_collection()
    vectorstore.delete_source_type(source_type)

    texts = [c["text"] for c in chunk_records]
    vectors = embeddings.embed_texts(texts)
    yield {"stage": "embed", "source_type": source_type, "chunk_count": len(chunk_records)}

    vectorstore.upsert_chunks(chunk_records, vectors["dense"], vectors["sparse"])
    _save_state(source_type, len(chunk_records))
    yield {"stage": "index", "source_type": source_type, "chunk_count": len(chunk_records)}
    yield {"stage": "done", "source_type": source_type, "chunk_count": len(chunk_records)}


def ingest_all_stream() -> Iterator[dict]:
    for source_type in config.SOURCE_TYPES:
        yield from ingest_source_stream(source_type)
    yield {"stage": "all_done"}


def main():
    args = sys.argv[1:]
    targets = args if args else list(config.SOURCE_TYPES.keys())
    for source_type in targets:
        if source_type not in config.SOURCE_TYPES:
            print(f"Skipping unknown source_type '{source_type}' (known: {list(config.SOURCE_TYPES)})")
            continue
        print(f"\n=== {source_type} ===")
        for event in ingest_source_stream(source_type):
            print(f"  [{event['stage']}] {event}")


if __name__ == "__main__":
    main()
