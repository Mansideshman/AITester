from __future__ import annotations

from functools import lru_cache

from . import config
from .chunker import Chunk

try:
    # Only needed for the local ChromaDB backend. Not installed in the lean
    # Vercel deployment (which uses Upstash Vector instead) — callers must
    # not reach the _chroma_* helpers when config.VECTOR_BACKEND != "chroma".
    import chromadb
except ImportError:
    chromadb = None


# ---------------------------------------------------------------------------
# ChromaDB backend (local dev)
# ---------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _chroma_client():
    return chromadb.PersistentClient(path=config.CHROMA_PATH)


def _chroma_collection():
    return _chroma_client().get_or_create_collection(
        name=config.COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def _chroma_reset() -> None:
    try:
        _chroma_client().delete_collection(config.COLLECTION_NAME)
    except Exception:
        pass


def _chroma_count() -> int:
    return _chroma_collection().count()


def _chroma_add_chunks(chunks: list[Chunk], vectors: list[list[float]]) -> None:
    _chroma_collection().add(
        ids=[c["id"] for c in chunks],
        embeddings=vectors,
        documents=[c["text"] for c in chunks],
        metadatas=[
            {"page": c["page"], "chunk_index": c["chunk_index"], "char_count": c["char_count"]}
            for c in chunks
        ],
    )


def _chroma_query(vector: list[float], top_k: int) -> list[dict]:
    result = _chroma_collection().query(
        query_embeddings=[vector],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    hits: list[dict] = []
    ids = result.get("ids", [[]])[0]
    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    dists = result.get("distances", [[]])[0]
    for i in range(len(ids)):
        distance = dists[i]
        similarity = max(0.0, min(1.0, 1 - distance))  # chroma cosine distance = 1 - cosine_similarity
        hits.append({
            "id": ids[i], "text": docs[i], "page": metas[i]["page"],
            "chunk_index": metas[i]["chunk_index"], "distance": distance, "similarity": similarity,
        })
    return hits


# ---------------------------------------------------------------------------
# Upstash Vector backend (Vercel deployment) — hosted embedding, no local
# model. Shares one free-tier index with AdvancedRAG, isolated by namespace.
# ---------------------------------------------------------------------------
def _upstash_headers() -> dict:
    return {
        "Authorization": f"Bearer {config.UPSTASH_VECTOR_REST_TOKEN}",
        "Content-Type": "application/json",
    }


def _upstash_url(path: str) -> str:
    return f"{config.UPSTASH_VECTOR_REST_URL}{path}/{config.UPSTASH_NAMESPACE}"


def _upstash_post(path: str, payload) -> dict:
    import requests

    resp = requests.post(_upstash_url(path), headers=_upstash_headers(), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["result"]


def _upstash_reset() -> None:
    _upstash_post("/reset", {})


def _upstash_count() -> int:
    import requests

    resp = requests.get(
        f"{config.UPSTASH_VECTOR_REST_URL}/info",
        headers=_upstash_headers(), timeout=15,
    )
    resp.raise_for_status()
    ns = resp.json()["result"].get("namespaces", {}).get(config.UPSTASH_NAMESPACE, {})
    return ns.get("vectorCount", 0)


def _upstash_add_chunks(chunks: list[Chunk]) -> None:
    payload = [
        {
            "id": c["id"],
            "data": c["text"],
            "metadata": {"page": c["page"], "chunk_index": c["chunk_index"], "char_count": c["char_count"]},
        }
        for c in chunks
    ]
    for start in range(0, len(payload), 100):
        _upstash_post("/upsert-data", payload[start:start + 100])


def _upstash_query(question: str, top_k: int) -> list[dict]:
    results = _upstash_post("/query-data", {
        "data": question, "topK": top_k, "includeMetadata": True, "includeData": True,
    })
    hits: list[dict] = []
    for r in results:
        meta = r.get("metadata") or {}
        hits.append({
            "id": r["id"], "text": r.get("data", ""), "page": meta.get("page"),
            "chunk_index": meta.get("chunk_index"), "distance": None, "similarity": r["score"],
        })
    return hits


# ---------------------------------------------------------------------------
# Public interface — pipeline.py only talks to these
# ---------------------------------------------------------------------------
def reset_collection() -> None:
    if config.VECTOR_BACKEND == "upstash":
        _upstash_reset()
    else:
        _chroma_reset()


def collection_count() -> int:
    if config.VECTOR_BACKEND == "upstash":
        return _upstash_count()
    return _chroma_count()


def add_chunks(chunks: list[Chunk], vectors: list[list[float]] | None) -> None:
    """`vectors=None` means "let the backend embed it" — only valid (and
    required) for the Upstash backend, which embeds server-side."""
    if not chunks:
        return
    if config.VECTOR_BACKEND == "upstash":
        _upstash_add_chunks(chunks)
    else:
        _chroma_add_chunks(chunks, vectors)


def query(question: str, query_vector: list[float] | None, top_k: int) -> list[dict]:
    """`query_vector=None` means query by raw text — only valid (and
    required) for the Upstash backend."""
    if config.VECTOR_BACKEND == "upstash":
        return _upstash_query(question, top_k)
    return _chroma_query(query_vector, top_k)
