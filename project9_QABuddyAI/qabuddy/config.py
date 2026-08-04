from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "data"

load_dotenv(PROJECT_DIR / ".env")

# --- Sources ---
# Every active source_type has a data/ subfolder and a (chunk_size, chunk_overlap)
# tuned to its content (code vs. prose vs. row-oriented vs. log blocks — see
# ARCHITECTURE.md for the reasoning). figma_design is reserved for phase 2:
# it has a data/ folder and a README but no entry here, so it's never
# dispatched by the ingest orchestrator.
SOURCE_TYPES: dict[str, dict] = {
    "selenium_code": {"folder": "selenium_repo", "chunk_size": 800, "chunk_overlap": 100},
    "playwright_code": {"folder": "playwright_repo", "chunk_size": 800, "chunk_overlap": 100},
    "test_case": {"folder": "test_cases", "chunk_size": 1000, "chunk_overlap": 150},
    "jira_ticket": {"folder": "jira_tickets", "chunk_size": 1200, "chunk_overlap": 150},
    "company_doc": {"folder": "company_docs", "chunk_size": 1000, "chunk_overlap": 150},
    "meeting_note": {"folder": "meeting_notes", "chunk_size": 1000, "chunk_overlap": 150},
    "lucidchart": {"folder": "lucidchart", "chunk_size": 1000, "chunk_overlap": 150},
    "prd_doc": {"folder": "prd_docs", "chunk_size": 1000, "chunk_overlap": 150},
    "jenkins_log": {"folder": "jenkins_logs", "chunk_size": 1500, "chunk_overlap": 200},
}

# Prose fallback for any ad-hoc chunk_text() call that doesn't pass explicit
# size/overlap (loaders normally pass SOURCE_TYPES[source_type] explicitly).
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))

# --- Embeddings (BGE-M3: dense + sparse from one model, run locally) ---
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
EMBEDDING_MAX_LENGTH = int(os.getenv("EMBEDDING_MAX_LENGTH", "512"))
BGE_USE_FP16 = os.getenv("BGE_USE_FP16", "0") == "1"  # CPU: fp16 offers no speedup, default off
INGEST_BATCH = int(os.getenv("INGEST_BATCH", "16"))
DENSE_DIM = 1024

# --- Reranker (local cross-encoder always — VPS deploy, no hosted fallback) ---
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")

# --- Vector store ---
# Qdrant, embedded file-store mode by default (./qdrant_data, no Docker).
# Set QDRANT_URL to point at a standalone Qdrant server instead — no other
# code changes needed.
QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_PATH = str(PROJECT_DIR / "qdrant_data")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "qabuddy")

# --- Retrieval ---
TOP_N_HYBRID = int(os.getenv("TOP_N_HYBRID", "20"))
TOP_K_RERANK = int(os.getenv("TOP_K_RERANK", "4"))
RRF_K = int(os.getenv("RRF_K", "60"))
REWRITE_ENABLED = os.getenv("REWRITE_ENABLED", "1") == "1"
NUM_REWRITES = int(os.getenv("NUM_REWRITES", "3"))

# --- LLM ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_PROVIDER = "openrouter" if OPENROUTER_API_KEY else "groq"

GENERATION_MODEL = os.getenv(
    "GENERATION_MODEL",
    "deepseek/deepseek-chat-v3.1" if LLM_PROVIDER == "openrouter" else "openai/gpt-oss-120b",
) or ("deepseek/deepseek-chat-v3.1" if LLM_PROVIDER == "openrouter" else "openai/gpt-oss-120b")
REWRITE_MODEL = os.getenv(
    "REWRITE_MODEL",
    "deepseek/deepseek-chat-v3.1" if LLM_PROVIDER == "openrouter" else "llama-3.1-8b-instant",
) or ("deepseek/deepseek-chat-v3.1" if LLM_PROVIDER == "openrouter" else "llama-3.1-8b-instant")
