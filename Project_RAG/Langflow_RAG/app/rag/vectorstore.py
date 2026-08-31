from __future__ import annotations

import requests

from . import config


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {config.UPSTASH_VECTOR_REST_TOKEN}",
        "Content-Type": "application/json",
    }


def _url(path: str) -> str:
    return f"{config.UPSTASH_VECTOR_REST_URL}{path}/{config.UPSTASH_NAMESPACE}"


def _post(path: str, payload) -> dict:
    resp = requests.post(_url(path), headers=_headers(), json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["result"]


def reset_collection() -> None:
    _post("/reset", {})


def collection_count() -> int:
    resp = requests.get(f"{config.UPSTASH_VECTOR_REST_URL}/info", headers=_headers(), timeout=15)
    resp.raise_for_status()
    ns = resp.json()["result"].get("namespaces", {}).get(config.UPSTASH_NAMESPACE, {})
    return ns.get("vectorCount", 0)


def upsert_chunks(chunk_records: list[dict]) -> None:
    payload = [
        {
            "id": str(rec["chunk_id"]),
            "data": rec["text"],
            "metadata": {"text": rec["text"], "row_index": rec["row_index"], **rec["meta"]},
        }
        for rec in chunk_records
    ]
    for start in range(0, len(payload), 100):
        _post("/upsert-data", payload[start:start + 100])


def query(question: str, top_k: int = None) -> list[dict]:
    """A single hosted-embedding retrieval call — no query rewriting, no
    hybrid dense/sparse fusion, no reranking. This mirrors the exported
    Langflow flow exactly: one embed, one similarity search, done."""
    top_k = top_k or config.TOP_K
    results = _post("/query-data", {
        "data": question, "topK": top_k, "includeMetadata": True, "includeData": True,
    })
    return [
        {"id": int(r["id"]), "score": r["score"], "text": r.get("data", ""), "meta": r.get("metadata") or {}}
        for r in results
    ]


def scroll_chunks(cursor: str = "0", limit: int = 50) -> tuple[list[dict], str | None]:
    result = _post("/range", {"cursor": cursor, "limit": limit, "includeMetadata": True, "includeData": True})
    points = [
        {"id": int(v["id"]), "text": v.get("data", ""), "meta": v.get("metadata") or {}}
        for v in result.get("vectors", [])
    ]
    next_cursor = result.get("nextCursor", "")
    return points, (next_cursor if next_cursor else None)
