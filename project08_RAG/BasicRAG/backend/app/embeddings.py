from __future__ import annotations

from functools import lru_cache

from . import config


@lru_cache(maxsize=1)
def _model():
    # Imported lazily: only needed for the local ChromaDB backend. Not
    # installed in the lean Vercel deployment, which uses Upstash Vector's
    # hosted embeddings instead — see config.VECTOR_BACKEND.
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(config.EMBEDDING_MODEL, trust_remote_code=True, device="cpu")


def embed_documents(texts: list[str]) -> list[list[float]]:
    prefixed = [config.EMBEDDING_DOCUMENT_PREFIX + t for t in texts]
    vectors = _model().encode(prefixed, normalize_embeddings=True, show_progress_bar=False)
    return vectors.tolist()


def embed_query(text: str) -> list[float]:
    vector = _model().encode(
        [config.EMBEDDING_QUERY_PREFIX + text], normalize_embeddings=True, show_progress_bar=False
    )[0]
    return vector.tolist()


def embedding_dimensions() -> int:
    return _model().get_sentence_embedding_dimension()
