from __future__ import annotations

from functools import lru_cache

import requests

from . import config


@lru_cache(maxsize=1)
def _local_model():
    from FlagEmbedding import FlagReranker

    return FlagReranker(config.RERANKER_MODEL, use_fp16=config.BGE_USE_FP16)


def _rerank_local(query: str, candidates: list[dict], top_k: int) -> list[dict]:
    pairs = [[query, c["payload"].get("text", "")] for c in candidates]
    scores = _local_model().compute_score(pairs, normalize=True)
    if isinstance(scores, float):
        scores = [scores]

    for c, s in zip(candidates, scores):
        c["rerank_score"] = float(s)

    reranked = sorted(candidates, key=lambda c: c["rerank_score"], reverse=True)
    return reranked[:top_k]


def _rerank_cohere(query: str, candidates: list[dict], top_k: int) -> list[dict]:
    documents = [c["payload"].get("text", "") for c in candidates]
    resp = requests.post(
        "https://api.cohere.com/v2/rerank",
        headers={"Authorization": f"Bearer {config.COHERE_API_KEY}", "Content-Type": "application/json"},
        json={"model": config.COHERE_RERANK_MODEL, "query": query, "documents": documents, "top_n": top_k},
        timeout=30,
    )
    resp.raise_for_status()
    results = resp.json()["results"]

    reranked = []
    for r in results:
        c = dict(candidates[r["index"]])
        c["rerank_score"] = float(r["relevance_score"])
        reranked.append(c)
    return reranked


def rerank(query: str, candidates: list[dict], top_k: int = None) -> list[dict]:
    """candidates: list of {id, score, payload}. Returns the same dicts,
    re-sorted, each augmented with a `rerank_score`."""
    top_k = top_k or config.TOP_K_RERANK
    if not candidates:
        return []
    if config.RERANK_BACKEND == "cohere":
        return _rerank_cohere(query, candidates, top_k)
    return _rerank_local(query, candidates, top_k)
