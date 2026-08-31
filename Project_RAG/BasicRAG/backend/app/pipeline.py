from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from . import config, embeddings, llm, vectorstore
from .chunker import Chunk, chunk_pages
from .document_loader import load_document_pages

_lock = threading.Lock()
_current_source_path: Path = config.DEFAULT_SOURCE_PATH

_state = {
    "status": "idle",  # idle | ingesting | ready | error
    "error": None,
    "source_name": config.DEFAULT_SOURCE_PATH.name,
    "source_folder": str(config.DEFAULT_SOURCE_PATH.parent),
    "num_pages": 0,
    "num_chunks": 0,
    "stored_count": 0,
    "chunk_size": config.CHUNK_SIZE,
    "chunk_overlap": config.CHUNK_OVERLAP,
    "embedding_model": config.EMBEDDING_MODEL,
    "embedding_dims": None,
    "collection_name": config.COLLECTION_NAME,
    "top_k": config.TOP_K,
    "llm_provider": "Groq",
    "llm_model": config.GROQ_MODEL,
    "ingested_at": None,
    "timings_ms": {},
    "sample_embedding": [],
    "steps": {
        "load": "pending",
        "chunk": "pending",
        "embed": "pending",
        "store": "pending",
    },
}

_chunks_cache: list[Chunk] = []
_chunk_embedding_preview: dict[str, list[float]] = {}


def get_status() -> dict:
    with _lock:
        snapshot = dict(_state, steps=dict(_state["steps"]), timings_ms=dict(_state["timings_ms"]))

    # On a fresh serverless cold start, in-memory state always resets to
    # "idle" even though the vector store itself (Upstash) already has data
    # from a prior ingest — reconcile against the real backend so /api/status
    # doesn't lie to the frontend about needing to re-ingest.
    if snapshot["status"] == "idle":
        try:
            count = vectorstore.collection_count()
        except Exception:
            count = 0
        if count > 0:
            snapshot["status"] = "ready"
            snapshot["stored_count"] = count
            snapshot["steps"] = {k: "done" for k in snapshot["steps"]}
    return snapshot


def get_chunks() -> list[dict]:
    with _lock:
        return [
            {**c, "embedding_preview": _chunk_embedding_preview.get(c["id"], [])}
            for c in _chunks_cache
        ]


def _set_step(name: str, value: str) -> None:
    _state["steps"][name] = value


def ingest(force: bool = False, source_path: Path | None = None) -> dict:
    global _chunks_cache, _chunk_embedding_preview, _current_source_path

    with _lock:
        if _state["status"] == "ready" and not force and source_path is None:
            return get_status()
        if source_path is not None:
            _current_source_path = source_path
        _state["status"] = "ingesting"
        _state["error"] = None
        _state["source_name"] = _current_source_path.name
        _state["source_folder"] = str(_current_source_path.parent)
        for k in _state["steps"]:
            _state["steps"][k] = "pending"

    active_path = _current_source_path
    timings: dict[str, float] = {}
    try:
        t0 = time.perf_counter()
        pages = load_document_pages(active_path)
        timings["load_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        _set_step("load", "done")

        t0 = time.perf_counter()
        chunks = chunk_pages(pages, config.CHUNK_SIZE, config.CHUNK_OVERLAP)
        timings["chunk_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        _set_step("chunk", "done")

        t0 = time.perf_counter()
        vectors = None
        if config.VECTOR_BACKEND != "upstash":
            vectors = embeddings.embed_documents([c["text"] for c in chunks])
        timings["embed_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        _set_step("embed", "done")

        t0 = time.perf_counter()
        vectorstore.reset_collection()
        vectorstore.add_chunks(chunks, vectors)
        timings["store_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        _set_step("store", "done")

        preview = {c["id"]: v[:8] for c, v in zip(chunks, vectors)} if vectors else {}

        with _lock:
            _chunks_cache = chunks
            _chunk_embedding_preview = preview
            _state.update(
                {
                    "status": "ready",
                    "num_pages": len(pages),
                    "num_chunks": len(chunks),
                    "stored_count": vectorstore.collection_count(),
                    "embedding_dims": len(vectors[0]) if vectors else None,
                    "ingested_at": datetime.now(timezone.utc).isoformat(),
                    "timings_ms": timings,
                    "sample_embedding": vectors[0][:8] if vectors else [],
                }
            )
        return get_status()
    except Exception as exc:  # noqa: BLE001
        with _lock:
            _state["status"] = "error"
            _state["error"] = str(exc)
        raise


def reset() -> dict:
    global _chunks_cache, _chunk_embedding_preview

    vectorstore.reset_collection()
    with _lock:
        _chunks_cache = []
        _chunk_embedding_preview = {}
        _state.update(
            {
                "status": "idle",
                "error": None,
                "num_pages": 0,
                "num_chunks": 0,
                "stored_count": 0,
                "embedding_dims": None,
                "ingested_at": None,
                "timings_ms": {},
                "sample_embedding": [],
                "steps": {k: "pending" for k in _state["steps"]},
            }
        )
    return get_status()


def answer_question(question: str) -> dict:
    # Don't trust in-memory _state alone — on a fresh serverless cold start
    # it's always "idle" even when the vector store already has data.
    if get_status()["status"] != "ready":
        raise RuntimeError("Ingestion has not completed yet. Try again shortly.")

    t0 = time.perf_counter()
    query_vector = None
    if config.VECTOR_BACKEND != "upstash":
        query_vector = embeddings.embed_query(question)
    embed_ms = round((time.perf_counter() - t0) * 1000, 1)

    t0 = time.perf_counter()
    hits = vectorstore.query(question, query_vector, config.TOP_K)
    retrieve_ms = round((time.perf_counter() - t0) * 1000, 1)

    t0 = time.perf_counter()
    answer = llm.generate_answer(question, hits)
    generate_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "question": question,
        "retrieved_chunks": hits,
        "answer": answer,
        "llm_model": config.GROQ_MODEL,
        "timings_ms": {
            "embed_query_ms": embed_ms,
            "retrieve_ms": retrieve_ms,
            "generate_ms": generate_ms,
            "total_ms": round(embed_ms + retrieve_ms + generate_ms, 1),
        },
    }
