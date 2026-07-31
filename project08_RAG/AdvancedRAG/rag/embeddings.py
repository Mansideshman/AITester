from __future__ import annotations

from functools import lru_cache
from typing import Callable, Iterable

from . import config


@lru_cache(maxsize=1)
def _model():
    # Imported lazily: torch + transformers are slow to import and we don't
    # want that cost paid on every Flask worker boot, only on first use.
    from FlagEmbedding import BGEM3FlagModel

    return BGEM3FlagModel(config.EMBEDDING_MODEL, use_fp16=config.BGE_USE_FP16)


def is_loaded() -> bool:
    return _model.cache_info().currsize > 0


def embed_texts(
    texts: list[str],
    batch_size: int = None,
    on_batch: Callable[[int, int], None] = None,
) -> dict:
    """Returns dense (list[list[float]]) + sparse (list[dict[str,float]],
    keyed by human-readable token) vectors for a list of texts, computed in
    batches so callers can stream progress."""
    batch_size = batch_size or config.INGEST_BATCH
    model = _model()

    dense_vecs: list[list[float]] = []
    sparse_vecs: list[dict] = []
    total = len(texts)
    for start in range(0, total, batch_size):
        batch = texts[start:start + batch_size]
        out = model.encode(
            batch,
            batch_size=len(batch),
            max_length=config.EMBEDDING_MAX_LENGTH,
            return_dense=True,
            return_sparse=True,
            return_colbert_vecs=False,
        )
        dense_vecs.extend(v.tolist() for v in out["dense_vecs"])
        for weights in out["lexical_weights"]:
            # lexical_weights keys are token ids (numpy ints); Qdrant sparse
            # vectors want plain ints as indices.
            sparse_vecs.append({int(k): float(v) for k, v in weights.items()})
        if on_batch:
            on_batch(min(start + batch_size, total), total)

    return {"dense": dense_vecs, "sparse": sparse_vecs}


def embed_query(text: str) -> dict:
    result = embed_texts([text], batch_size=1)
    return {"dense": result["dense"][0], "sparse": result["sparse"][0]}


def sparse_preview(sparse_weights: dict, top_n: int = 5) -> list[dict]:
    """Top-N sparse dims by weight, decoded back to readable subword tokens
    for the UI."""
    if not sparse_weights:
        return []
    tokenizer = _model().tokenizer
    ranked = sorted(sparse_weights.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    out = []
    for tok_id, weight in ranked:
        try:
            token = tokenizer.decode([int(tok_id)]).strip()
        except Exception:
            token = str(tok_id)
        out.append({"token": token, "weight": round(float(weight), 4)})
    return out
