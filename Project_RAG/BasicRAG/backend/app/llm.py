from __future__ import annotations

from functools import lru_cache

from groq import Groq

from . import config


class GroqNotConfiguredError(RuntimeError):
    pass


SYSTEM_PROMPT = (
    "You are the RAG Explorer assistant. Answer the user's question using ONLY the "
    "context chunks provided below, which were retrieved from a Product Requirements "
    "Document for vwo.com. If the answer is not contained in the context, say you "
    "don't have enough information in the document. Be concise and cite the chunk "
    "number(s) you used, e.g. [chunk 2]."
)


@lru_cache(maxsize=1)
def _client() -> Groq:
    if not config.GROQ_API_KEY:
        raise GroqNotConfiguredError(
            "GROQ_API_KEY is not set. Add it to backend/.env to enable answer generation."
        )
    return Groq(api_key=config.GROQ_API_KEY)


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        parts.append(f"[chunk {i}] (page {c['page']})\n{c['text']}")
    return "\n\n".join(parts)


def generate_answer(question: str, chunks: list[dict]) -> str:
    context = build_context(chunks)
    user_prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"

    response = _client().chat.completions.create(
        model=config.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=600,
    )
    return response.choices[0].message.content
