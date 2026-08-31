from __future__ import annotations

import re

import requests

from . import config

BASE_URLS = {
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}

REWRITE_SYSTEM_PROMPT = (
    "You rewrite search queries for a hybrid (dense + sparse) retrieval system over a "
    "corpus of software test cases. Given the user's question, produce {n} alternate "
    "phrasings that surface different relevant keywords/synonyms while preserving intent. "
    "Reply with exactly {n} lines, one rewrite per line, no numbering, no extra commentary."
)

ANSWER_SYSTEM_PROMPT = (
    "You are the Advanced RAG Explorer assistant. Answer the user's question using ONLY "
    "the context chunks below, retrieved from a corpus of VWO test cases. If the context "
    "doesn't contain the answer, say so plainly. Be concise and cite the chunk number(s) "
    "you used, e.g. [Chunk 2]."
)

GENERATE_SYSTEM_PROMPT = (
    "You are the Advanced RAG Explorer assistant, in test-case-authoring mode. The user "
    "wants a NEW test case created. Use the retrieved similar test cases below purely as "
    "style/structure templates (do not copy their content verbatim). Produce a single new "
    "test case with exactly these sections:\n"
    "Title:\nPreconditions:\nSteps:\nExpected:\nPriority:\nTags:\n"
    "Cite which retrieved chunk(s) inspired the structure, e.g. [Chunk 2]."
)

GENERATE_TRIGGER_RE = re.compile(
    r"\b(create|generate|write|draft|add)\b.{0,40}\b(test case|testcase)\b", re.IGNORECASE
)


class LLMNotConfiguredError(RuntimeError):
    pass


def _chat(messages: list[dict], model: str, temperature: float = 0.2, max_tokens: int = 700) -> str:
    provider = config.LLM_PROVIDER
    api_key = config.OPENROUTER_API_KEY if provider == "openrouter" else config.GROQ_API_KEY
    if not api_key:
        raise LLMNotConfiguredError(
            f"No API key set for provider '{provider}'. Add GROQ_API_KEY (or OPENROUTER_API_KEY) to .env."
        )
    resp = requests.post(
        f"{BASE_URLS[provider]}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def detect_mode(question: str) -> str:
    return "generate" if GENERATE_TRIGGER_RE.search(question) else "answer"


def rewrite_query(question: str, n: int = None) -> list[str]:
    n = n or config.NUM_REWRITES
    if not config.REWRITE_ENABLED:
        return [question]
    try:
        content = _chat(
            [
                {"role": "system", "content": REWRITE_SYSTEM_PROMPT.format(n=n)},
                {"role": "user", "content": question},
            ],
            model=config.REWRITE_MODEL,
            temperature=0.5,
            max_tokens=200,
        )
    except Exception:
        return [question]
    lines = [ln.strip("-* \t") for ln in content.splitlines() if ln.strip()]
    lines = lines[:n] if lines else [question]
    return lines


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        payload = c["payload"]
        meta_bits = ", ".join(f"{k}={v}" for k, v in payload.items() if k not in ("text",))
        parts.append(f"[Chunk {i}] ({meta_bits})\n{payload.get('text', '')}")
    return "\n\n".join(parts)


def generate_answer(question: str, chunks: list[dict]) -> str:
    context = build_context(chunks)
    user_prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    return _chat(
        [
            {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=config.GENERATION_MODEL,
    )


def generate_test_case(question: str, chunks: list[dict]) -> str:
    context = build_context(chunks)
    user_prompt = f"Similar existing test cases:\n{context}\n\nRequest: {question}\n\nNew test case:"
    return _chat(
        [
            {"role": "system", "content": GENERATE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=config.GENERATION_MODEL,
        max_tokens=800,
    )
