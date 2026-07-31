import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parent.parent

load_dotenv(PROJECT_DIR / ".env")

# Vercel's filesystem is read-only except /tmp; Vercel sets VERCEL=1 at runtime.
ON_VERCEL = os.getenv("VERCEL") == "1"

# --- Uploads ---
UPLOAD_DIR = Path("/tmp/uploads") if ON_VERCEL else (PROJECT_DIR / "uploads")
ALLOWED_UPLOAD_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "50"))

# --- Chunking ---
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))

# --- Embeddings (BGE-M3: dense + sparse from one model, run locally) ---
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
EMBEDDING_MAX_LENGTH = int(os.getenv("EMBEDDING_MAX_LENGTH", "512"))
BGE_USE_FP16 = os.getenv("BGE_USE_FP16", "0") == "1"  # CPU: fp16 offers no speedup, default off
INGEST_BATCH = int(os.getenv("INGEST_BATCH", "16"))
DENSE_DIM = 1024

# --- Reranker ---
# Local dev (default): bge-reranker-v2-m3 via transformers, run locally.
# Deployed on Vercel: Cohere Rerank (hosted) — selected automatically when
# COHERE_API_KEY is set, since torch+transformers alone (730MB+) already
# exceed Vercel's 500MB function bundle limit on the Hobby plan.
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")
COHERE_RERANK_MODEL = os.getenv("COHERE_RERANK_MODEL", "rerank-v3.5")
RERANK_BACKEND = "cohere" if COHERE_API_KEY else "local"

# --- Vector store ---
# Local dev (default): Qdrant, embedded file-store mode — no Docker needed.
# Deployed on Vercel: Upstash Vector (hosted hybrid dense+sparse index) —
# selected automatically when its env vars are present, since Vercel's
# ephemeral filesystem can't hold an embedded Qdrant index and bge-m3 is too
# slow/large to cold-start as a serverless function. See rag/upstash_store.py.
QDRANT_URL = os.getenv("QDRANT_URL", "")  # if set, connect to a real server instead of embedded
QDRANT_PATH = str(PROJECT_DIR / "qdrant_data")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "vwo_test_cases")

UPSTASH_VECTOR_REST_URL = os.getenv("UPSTASH_VECTOR_REST_URL", "")
UPSTASH_VECTOR_REST_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN", "")
VECTOR_BACKEND = "upstash" if UPSTASH_VECTOR_REST_URL else "qdrant"

# --- Retrieval ---
TOP_N_HYBRID = int(os.getenv("TOP_N_HYBRID", "20"))
TOP_K_RERANK = int(os.getenv("TOP_K_RERANK", "4"))
RRF_K = int(os.getenv("RRF_K", "60"))
REWRITE_ENABLED = os.getenv("REWRITE_ENABLED", "1") == "1"
NUM_REWRITES = int(os.getenv("NUM_REWRITES", "3"))

# --- LLM ---
# The Advanced RAG spec calls for Openrouter; this environment only has a
# GROQ_API_KEY provisioned (same as BasicRAG), so both rewriting and
# generation default to Groq's OpenAI-compatible API. Set OPENROUTER_API_KEY
# to switch providers without touching any other code.
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_PROVIDER = "openrouter" if OPENROUTER_API_KEY else "groq"

GENERATION_MODEL = os.getenv(
    "GENERATION_MODEL",
    "deepseek/deepseek-chat-v3.1" if LLM_PROVIDER == "openrouter" else "openai/gpt-oss-120b",
)
REWRITE_MODEL = os.getenv(
    "REWRITE_MODEL",
    "deepseek/deepseek-chat-v3.1" if LLM_PROVIDER == "openrouter" else "llama-3.1-8b-instant",
)
