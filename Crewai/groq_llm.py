"""Groq LLM factory for CrewAI agents.

Reads GROQ_API_KEY, GROQ_MODEL, BASE_URL from .env and returns a
configured crewai.LLM instance backed by Groq via LiteLLM.
"""

import sys

try:
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except ImportError:
    pass

import os

from dotenv import load_dotenv
from crewai import LLM

# crewai marks messages with a "cache_breakpoint" key for providers that
# support prompt caching (Anthropic, OpenAI). Its generic LiteLLM passthrough
# path (used for Groq, which isn't a "native" provider) never strips that key
# before sending, and Groq's API rejects the unknown field. Groq doesn't
# support this caching feature, so disable the marker instead.
import crewai.llms.cache as _crewai_cache

_crewai_cache.mark_cache_breakpoint = lambda message: message

load_dotenv()


def get_groq_llm(temperature: float = 0.7) -> LLM:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL")

    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env")
    if not model:
        raise ValueError("GROQ_MODEL not set in .env")

    model = model.strip('"').strip("'")

    # No base_url: litellm's "groq/" provider prefix already routes to
    # Groq's endpoint natively. Passing base_url explicitly makes litellm
    # treat this as a generic OpenAI-compatible call and inject caching
    # params (cache_breakpoint) that Groq's API rejects.
    return LLM(
        model=f"groq/{model}",
        api_key=api_key,
        temperature=temperature,
    )


if __name__ == "__main__":
    llm = get_groq_llm()
    print(f"Groq LLM ready: {llm.model}")
