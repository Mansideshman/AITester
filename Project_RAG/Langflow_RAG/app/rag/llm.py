from __future__ import annotations

import requests

from . import config

SYSTEM_PROMPT = (
    "You are a QA assistant answering questions about a suite of VWO test cases. Answer "
    "using ONLY the retrieved test case context below. If the context doesn't contain the "
    "answer, say so plainly. Cite which chunk(s) you used, e.g. [Chunk 2]."
)


class GroqNotConfiguredError(RuntimeError):
    pass


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        meta_bits = ", ".join(f"{k}={v}" for k, v in c["meta"].items() if k != "text")
        parts.append(f"[Chunk {i}] ({meta_bits})\n{c['text']}")
    return "\n\n".join(parts)


def generate_answer(question: str, chunks: list[dict]) -> str:
    if not config.GROQ_API_KEY:
        raise GroqNotConfiguredError("GROQ_API_KEY is not set.")

    context = build_context(chunks)
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {config.GROQ_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": config.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"},
            ],
            "temperature": 0.2,
            "max_tokens": 600,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]
