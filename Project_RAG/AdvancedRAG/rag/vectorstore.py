from __future__ import annotations

from functools import lru_cache

try:
    # Only needed for the local embedded-Qdrant backend. Not installed in the
    # lean Vercel deployment (which uses rag/upstash_store.py instead), so
    # this import is optional — callers must not reach this module when
    # config.VECTOR_BACKEND != "qdrant".
    from qdrant_client import QdrantClient, models
except ImportError:
    QdrantClient = None
    models = None

from . import config

DENSE_VEC_NAME = "dense"
SPARSE_VEC_NAME = "sparse"
FILTERABLE_FIELDS = ["priority", "module", "jira_id"]


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    if config.QDRANT_URL:
        return QdrantClient(url=config.QDRANT_URL)
    return QdrantClient(path=config.QDRANT_PATH)


def collection_exists() -> bool:
    return get_client().collection_exists(config.COLLECTION_NAME)


def recreate_collection():
    client = get_client()
    if client.collection_exists(config.COLLECTION_NAME):
        client.delete_collection(config.COLLECTION_NAME)
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


def upsert_chunks(chunk_records: list[dict], dense_vecs: list[list[float]], sparse_vecs: list[dict]):
    client = get_client()
    points = []
    for rec, dense, sparse in zip(chunk_records, dense_vecs, sparse_vecs):
        indices = list(sparse.keys())
        values = list(sparse.values())
        payload = {
            "text": rec["text"],
            "row_index": rec["row_index"],
            "chunk_index_in_row": rec["chunk_index_in_row"],
            **rec["meta"],
        }
        points.append(models.PointStruct(
            id=rec["chunk_id"],
            vector={
                DENSE_VEC_NAME: dense,
                SPARSE_VEC_NAME: models.SparseVector(indices=indices, values=values),
            },
            payload=payload,
        ))
    if points:
        client.upsert(collection_name=config.COLLECTION_NAME, points=points)


def dense_search(dense_vec: list[float], limit: int) -> list[models.ScoredPoint]:
    client = get_client()
    return client.search(
        collection_name=config.COLLECTION_NAME,
        query_vector=models.NamedVector(name=DENSE_VEC_NAME, vector=dense_vec),
        limit=limit,
        with_payload=True,
    )


def sparse_search(sparse_vec: dict, limit: int) -> list[models.ScoredPoint]:
    client = get_client()
    indices = list(sparse_vec.keys())
    values = list(sparse_vec.values())
    return client.search(
        collection_name=config.COLLECTION_NAME,
        query_vector=models.NamedSparseVector(
            name=SPARSE_VEC_NAME, vector=models.SparseVector(indices=indices, values=values)
        ),
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
    if not filters:
        return None
    conditions = []
    for key, value in filters.items():
        if value in (None, ""):
            continue
        if key == "search":
            conditions.append(models.FieldCondition(key="text", match=models.MatchText(text=value)))
        elif key in FILTERABLE_FIELDS:
            conditions.append(models.FieldCondition(key=key, match=models.MatchValue(value=value)))
    return models.Filter(must=conditions) if conditions else None


def scroll_chunks(offset=None, limit: int = 50, filters: dict = None, with_vectors: bool = False):
    client = get_client()
    q_filter = _build_filter(filters or {})
    points, next_offset = client.scroll(
        collection_name=config.COLLECTION_NAME,
        limit=limit,
        offset=offset,
        with_payload=True,
        with_vectors=with_vectors,
        scroll_filter=q_filter,
    )
    return points, next_offset


def get_by_ids(ids: list[int]) -> list:
    if not ids:
        return []
    client = get_client()
    return client.retrieve(collection_name=config.COLLECTION_NAME, ids=ids, with_payload=True, with_vectors=True)


def collection_info() -> dict:
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
