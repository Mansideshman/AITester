from __future__ import annotations

from functools import lru_cache

import chromadb

from . import config
from .chunker import Chunk


@lru_cache(maxsize=1)
def _client() -> chromadb.ClientAPI:
    return chromadb.PersistentClient(path=config.CHROMA_PATH)


def _collection():
    return _client().get_or_create_collection(
        name=config.COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def reset_collection() -> None:
    try:
        _client().delete_collection(config.COLLECTION_NAME)
    except Exception:
        pass


def collection_count() -> int:
    return _collection().count()


def add_chunks(chunks: list[Chunk], embeddings: list[list[float]]) -> None:
    if not chunks:
        return
    _collection().add(
        ids=[c["id"] for c in chunks],
        embeddings=embeddings,
        documents=[c["text"] for c in chunks],
        metadatas=[
            {"page": c["page"], "chunk_index": c["chunk_index"], "char_count": c["char_count"]}
            for c in chunks
        ],
    )


def query(embedding: list[float], top_k: int) -> list[dict]:
    result = _collection().query(
        query_embeddings=[embedding],
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
        hits.append(
            {
                "id": ids[i],
                "text": docs[i],
                "page": metas[i]["page"],
                "chunk_index": metas[i]["chunk_index"],
                "distance": distance,
                "similarity": similarity,
            }
        )
    return hits
