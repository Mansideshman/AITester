from __future__ import annotations

import requests

from . import config

BASE_URLS = {
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}

REWRITE_SYSTEM_PROMPT = (
    "You rewrite search queries for a hybrid (dense + sparse) retrieval system over a "
    "QA engineering knowledge base — Selenium/Playwright test automation code, test cases, "
    "JIRA tickets, PRDs, meeting notes, and Jenkins CI logs. Given the user's question, "
    "produce {n} alternate phrasings that surface different relevant keywords/synonyms "
    "while preserving intent. Reply with exactly {n} lines, one rewrite per line, no "
    "numbering, no extra commentary."
)

ANSWER_SYSTEM_PROMPT = (
    "You are QABuddyAI, a QA engineering assistant grounded in the company's Selenium and "
    "Playwright test automation frameworks, test case repository, JIRA bug/ticket history, "
    "PRDs/SRS/BRD/FRD, meeting notes, and Jenkins CI logs. Answer the user's question using "
    "ONLY the context chunks below. If the context doesn't contain the answer, say so "
    "plainly — do not invent test steps, code, or ticket details. Be concise, and cite the "
    "source label(s) you used, e.g. [Selenium: LoginPage.java testValidLogin()] or "
    "[JIRA-4521]. When multiple sources corroborate or contradict each other (e.g. a "
    "Jenkins failure vs. the PRD's expected behavior), point that out explicitly."
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
        json={"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


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
    return lines[:n] if lines else [question]


def format_citation(payload: dict) -> str:
    """Human-readable citation label, switching on source_type."""
    st = payload.get("source_type")
    if st in ("selenium_code", "playwright_code"):
        label = "Selenium" if st == "selenium_code" else "Playwright"
        file_path = payload.get("file_path", "?")
        symbol = payload.get("method_name") or payload.get("symbol_name")
        lines = f"L{payload.get('start_line')}-{payload.get('end_line')}" if payload.get("start_line") else ""
        return f"[{label}: {file_path}{f' {symbol}()' if symbol else ''} {lines}]".replace("  ", " ")
    if st == "test_case":
        return f"[Test Case {payload.get('source_id', '?')}]"
    if st == "jira_ticket":
        return f"[{payload.get('jira_id', payload.get('source_id', '?'))}]"
    if st in ("company_doc", "prd_doc"):
        label = "PRD" if st == "prd_doc" else "Doc"
        return f"[{label}: {payload.get('doc_name', '?')} p.{payload.get('page', '?')}]"
    if st == "meeting_note":
        return f"[Meeting Note: {payload.get('doc_name', '?')}]"
    if st == "lucidchart":
        return f"[Lucidchart: {payload.get('diagram_name', '?')}]"
    if st == "jenkins_log":
        status = f" {payload.get('status').upper()}" if payload.get("status") else ""
        return f"[Jenkins: {payload.get('job_name', '?')} :: {payload.get('test_name', '?')}{status}]"
    return f"[{payload.get('title', payload.get('source_id', '?'))}]"


def build_context(chunks: list[dict]) -> str:
    parts = []
    for c in chunks:
        payload = c["payload"]
        parts.append(f"{format_citation(payload)}\n{payload.get('text', '')}")
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
