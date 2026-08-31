from __future__ import annotations

from functools import lru_cache

from . import config


@lru_cache(maxsize=1)
def _model():
    from FlagEmbedding import FlagReranker

    return FlagReranker(config.RERANKER_MODEL, use_fp16=config.BGE_USE_FP16)


def rerank(query: str, candidates: list[dict], top_k: int = None) -> list[dict]:
    """candidates: list of {id, score, payload}. Returns the same dicts,
    re-sorted, each augmented with a `rerank_score`."""
    top_k = top_k or config.TOP_K_RERANK
    if not candidates:
        return []

    pairs = [[query, c["payload"].get("text", "")] for c in candidates]
    scores = _model().compute_score(pairs, normalize=True)
    if isinstance(scores, float):
        scores = [scores]

    for c, s in zip(candidates, scores):
        c["rerank_score"] = float(s)

    reranked = sorted(candidates, key=lambda c: c["rerank_score"], reverse=True)
    return reranked[:top_k]
