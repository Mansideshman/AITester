from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from functools import lru_cache

from qdrant_client import QdrantClient, models

from . import config

DENSE_VEC_NAME = "dense"
SPARSE_VEC_NAME = "sparse"
# Fixed namespace so make_point_id() is deterministic across runs.
_POINT_ID_NAMESPACE = uuid.UUID("a3f1e2b4-6c7d-4e8f-9a0b-1c2d3e4f5a6b")

# Qdrant's embedded/local client (QdrantClient(path=...)) is a single-process,
# non-server reference implementation — it is NOT safe for concurrent access
# from multiple threads. FastAPI runs sync routes in a shared threadpool, so
# without this lock, a health/sources GET (read) racing a long-running
# ingest's delete+upsert (write) on the same cached client instance can
# corrupt its in-memory state and silently drop previously-indexed points on
# the next write-back to disk. All client access in this module goes through
# `_client_lock` as a result. (A real Qdrant server via QDRANT_URL wouldn't
# need this — it handles its own concurrency.)
_client_lock = threading.Lock()


def make_point_id(source_type: str, source_id: str, chunk_index: int) -> str:
    """Deterministic point ID: re-ingesting the same chunk overwrites the
    same Qdrant point instead of duplicating it."""
    return str(uuid.uuid5(_POINT_ID_NAMESPACE, f"{source_type}:{source_id}:{chunk_index}"))

# source_type is mandatory on every payload; the rest are optional
# per-source-type fields (Qdrant payloads are sparse, so chunks from
# unrelated sources simply won't carry them).
FILTERABLE_FIELDS = [
    "source_type", "priority", "module", "test_type", "status",
    "jira_id", "repo_name", "doc_name",
]


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    if config.QDRANT_URL:
        return QdrantClient(url=config.QDRANT_URL)
    return QdrantClient(path=config.QDRANT_PATH)


def collection_exists() -> bool:
    with _client_lock:
        return get_client().collection_exists(config.COLLECTION_NAME)


def ensure_collection():
    """Creates the collection if it doesn't exist yet. Unlike AdvancedRAG's
    recreate_collection (one-shot demo re-ingest), QABuddy ingests source
    types independently over time, so ingesting one source must not wipe
    chunks already indexed from another."""
    with _client_lock:
        client = get_client()
        if client.collection_exists(config.COLLECTION_NAME):
            return
        client.create_collection(
            collection_name=config.COLLECTION_NAME,
            vectors_config={
                DENSE_VEC_NAME: models.VectorParams(size=config.DENSE_DIM, distance=models.Distance.COSINE),
            },
            sparse_vectors_config={
                SPARSE_VEC_NAME: models.SparseVectorParams(),
            },
        )
        for field in FILTERABLE_FIELDS:
            client.create_payload_index(config.COLLECTION_NAME, field_name=field, field_schema=models.PayloadSchemaType.KEYWORD)
        client.create_payload_index(
            config.COLLECTION_NAME, field_name="text", field_schema=models.TextIndexParams(type=models.TextIndexType.TEXT)
        )


def delete_source_type(source_type: str):
    """Drops all previously-indexed chunks for one source_type, so
    re-ingesting it doesn't leave stale points behind."""
    with _client_lock:
        client = get_client()
        if not client.collection_exists(config.COLLECTION_NAME):
            return
        client.delete(
            collection_name=config.COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(must=[models.FieldCondition(key="source_type", match=models.MatchValue(value=source_type))])
            ),
        )


def upsert_chunks(chunk_records: list[dict], dense_vecs: list[list[float]], sparse_vecs: list[dict]):
    now = datetime.now(timezone.utc).isoformat()
    points = []
    for rec, dense, sparse in zip(chunk_records, dense_vecs, sparse_vecs):
        indices = list(sparse.keys())
        values = list(sparse.values())
        payload = {
            "text": rec["text"],
            "source_type": rec["source_type"],
            "source_id": rec["source_id"],
            "chunk_index": rec["chunk_index"],
            "title": rec["title"],
            "ingested_at": now,
            **rec.get("meta", {}),
        }
        points.append(models.PointStruct(
            id=make_point_id(rec["source_type"], rec["source_id"], rec["chunk_index"]),
            vector={
                DENSE_VEC_NAME: dense,
                SPARSE_VEC_NAME: models.SparseVector(indices=indices, values=values),
            },
            payload=payload,
        ))
    if points:
        with _client_lock:
            get_client().upsert(collection_name=config.COLLECTION_NAME, points=points)


def dense_search(dense_vec: list[float], limit: int, filters: dict = None) -> list[models.ScoredPoint]:
    with _client_lock:
        return get_client().search(
            collection_name=config.COLLECTION_NAME,
            query_vector=models.NamedVector(name=DENSE_VEC_NAME, vector=dense_vec),
            query_filter=_build_filter(filters or {}),
            limit=limit,
            with_payload=True,
        )


def sparse_search(sparse_vec: dict, limit: int, filters: dict = None) -> list[models.ScoredPoint]:
    indices = list(sparse_vec.keys())
    values = list(sparse_vec.values())
    with _client_lock:
        return get_client().search(
            collection_name=config.COLLECTION_NAME,
            query_vector=models.NamedSparseVector(
                name=SPARSE_VEC_NAME, vector=models.SparseVector(indices=indices, values=values)
            ),
            query_filter=_build_filter(filters or {}),
            limit=limit,
            with_payload=True,
        )


def rrf_fuse(dense_hits: list, sparse_hits: list, k: int = None, top_n: int = None) -> list[dict]:
    """Reciprocal Rank Fusion over two ranked lists, keyed by point id."""
    k = k if k is not None else config.RRF_K
    scores: dict[int, float] = {}
    payloads: dict[int, dict] = {}
    for rank, hit in enumerate(dense_hits, start=1):
        scores[hit.id] = scores.get(hit.id, 0.0) + 1.0 / (k + rank)
        payloads[hit.id] = hit.payload
    for rank, hit in enumerate(sparse_hits, start=1):
        scores[hit.id] = scores.get(hit.id, 0.0) + 1.0 / (k + rank)
        payloads[hit.id] = hit.payload

    fused = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    if top_n:
        fused = fused[:top_n]
    return [{"id": pid, "score": score, "payload": payloads[pid]} for pid, score in fused]


def _build_filter(filters: dict) -> models.Filter | None:
    conditions = []
    for key, value in filters.items():
        if value in (None, ""):
            continue
        if key == "source_types":
            conditions.append(models.FieldCondition(key="source_type", match=models.MatchAny(any=list(value))))
        elif key in FILTERABLE_FIELDS:
            conditions.append(models.FieldCondition(key=key, match=models.MatchValue(value=value)))
    return models.Filter(must=conditions) if conditions else None


def scroll_chunks(offset=None, limit: int = 50, filters: dict = None, with_vectors: bool = False):
    with _client_lock:
        points, next_offset = get_client().scroll(
            collection_name=config.COLLECTION_NAME,
            limit=limit,
            offset=offset,
            with_payload=True,
            with_vectors=with_vectors,
            scroll_filter=_build_filter(filters or {}),
        )
    return points, next_offset


def count(source_type: str = None) -> int:
    with _client_lock:
        client = get_client()
        if not client.collection_exists(config.COLLECTION_NAME):
            return 0
        q_filter = _build_filter({"source_type": source_type}) if source_type else None
        return client.count(collection_name=config.COLLECTION_NAME, count_filter=q_filter, exact=True).count


def collection_info() -> dict:
    with _client_lock:
        client = get_client()
        if not client.collection_exists(config.COLLECTION_NAME):
            return {"exists": False}
        info = client.get_collection(config.COLLECTION_NAME)
        return {
            "exists": True,
            "points_count": info.points_count,
            "status": str(info.status),
            "vectors_config": DENSE_VEC_NAME,
            "sparse_config": SPARSE_VEC_NAME,
        }
