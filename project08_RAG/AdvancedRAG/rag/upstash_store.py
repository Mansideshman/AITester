from __future__ import annotations

import requests

from . import config

FILTERABLE_FIELDS = ["priority", "module", "jira_id"]
_BATCH_SIZE = 100  # Upstash upsert-data payload limit is generous, but keep requests small


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {config.UPSTASH_VECTOR_REST_TOKEN}",
        "Content-Type": "application/json",
    }


def _url(path: str) -> str:
    return f"{config.UPSTASH_VECTOR_REST_URL}{path}"


def _post(path: str, payload) -> dict:
    resp = requests.post(_url(path), headers=_headers(), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["result"]


def _delete(path: str, payload) -> dict:
    resp = requests.request("DELETE", _url(path), headers=_headers(), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["result"]


def collection_info() -> dict:
    resp = requests.get(_url("/info"), headers=_headers(), timeout=15)
    resp.raise_for_status()
    info = resp.json()["result"]
    return {
        "exists": info["vectorCount"] > 0,
        "points_count": info["vectorCount"],
        "status": "green",
        "vectors_config": f"hosted-dense ({info['denseIndex']['embeddingModel']})",
        "sparse_config": f"hosted-sparse ({info['sparseIndex']['embeddingModel']})",
    }


def collection_exists() -> bool:
    return collection_info()["exists"]


def recreate_collection():
    _post("/reset", {})


def upsert_chunks(chunk_records: list[dict]):
    """Upsert raw text — Upstash computes both the dense and sparse vectors
    server-side (hosted embedding + BM25), so there's no local embedding step."""
    for start in range(0, len(chunk_records), _BATCH_SIZE):
        batch = chunk_records[start:start + _BATCH_SIZE]
        payload = [
            {
                "id": str(rec["chunk_id"]),
                "data": rec["text"],
                "metadata": {
                    "text": rec["text"],
                    "row_index": rec["row_index"],
                    "chunk_index_in_row": rec["chunk_index_in_row"],
                    **rec["meta"],
                },
            }
            for rec in batch
        ]
        _post("/upsert-data", payload)


def _filter_expr(filters: dict) -> str:
    clauses = []
    for key, value in (filters or {}).items():
        if not value or key not in FILTERABLE_FIELDS:
            continue
        escaped = str(value).replace("'", "\\'")
        clauses.append(f"{key} = '{escaped}'")
    return " AND ".join(clauses)


def hybrid_query(query_text: str, top_k: int, filters: dict = None) -> list[dict]:
    """One Upstash call returns an already-fused (dense+sparse) ranked list —
    Upstash's hybrid index does its own RRF-style fusion server-side."""
    payload = {
        "data": query_text,
        "topK": top_k,
        "includeMetadata": True,
        "includeData": True,
    }
    expr = _filter_expr(filters)
    if expr:
        payload["filter"] = expr
    results = _post("/query-data", payload)
    return [
        {"id": int(r["id"]), "score": r["score"], "payload": r.get("metadata") or {}}
        for r in results
    ]


def get_by_ids(ids: list[int]) -> list[dict]:
    if not ids:
        return []
    results = _post("/fetch", {"ids": [str(i) for i in ids], "includeMetadata": True, "includeData": True})
    return [
        {"id": int(r["id"]), "payload": r.get("metadata") or {}}
        for r in results
        if r  # fetch returns null entries for missing ids
    ]


def scroll_chunks(cursor: str = "0", limit: int = 50) -> tuple[list[dict], str]:
    # NOTE: Upstash's /range does not actually apply a `filter` — verified
    # empirically (filtering for priority='Critical' still returned every
    # vector regardless of priority). So this always does an unfiltered
    # page, and filtering happens client-side in list_all_chunks/app.py.
    payload = {"cursor": cursor, "limit": limit, "includeMetadata": True, "includeData": True}
    result = _post("/range", payload)
    points = [
        {"id": int(v["id"]), "payload": v.get("metadata") or {}}
        for v in result.get("vectors", [])
    ]
    next_cursor = result.get("nextCursor", "")
    return points, (next_cursor if next_cursor else None)


def _matches_filters(payload: dict, filters: dict) -> bool:
    for key, value in (filters or {}).items():
        if not value:
            continue
        if key == "search":
            if value.lower() not in payload.get("text", "").lower():
                return False
        elif key in FILTERABLE_FIELDS:
            if str(payload.get(key, "")) != str(value):
                return False
    return True


def list_all_chunks(filters: dict = None) -> list[dict]:
    """Fetches every chunk and filters client-side (Upstash's /range filter
    param doesn't work) — fine at this app's demo scale (thousands, not
    millions, of chunks)."""
    all_points = []
    cursor = "0"
    while True:
        points, next_cursor = scroll_chunks(cursor=cursor, limit=1000)
        all_points.extend(points)
        if not next_cursor or next_cursor == "0":
            break
        cursor = next_cursor
    if filters and any(filters.values()):
        all_points = [p for p in all_points if _matches_filters(p["payload"], filters)]
    return all_points
