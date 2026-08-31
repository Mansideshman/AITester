import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")

# Vercel's filesystem is read-only except /tmp; Vercel sets VERCEL=1 at runtime.
ON_VERCEL = os.getenv("VERCEL") == "1"

# --- Source data ---
DATA_DIR = PROJECT_DIR / "data"
DEFAULT_SOURCE_PATH = Path(
    os.getenv("PDF_PATH", str(DATA_DIR / "Product Requirements Document_(PRD)_VWO.com.pdf"))
)

# --- Uploads ---
UPLOAD_DIR = Path("/tmp/uploads") if ON_VERCEL else (BACKEND_DIR / "uploads")
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".txt", ".md", ".doc", ".docx"}
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "20"))

# --- Chunking ---
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))

# --- Embeddings (Nomic Embed, run locally via sentence-transformers) ---
# Only used by the local ChromaDB backend — see VECTOR_BACKEND below.
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-ai/nomic-embed-text-v1.5")
EMBEDDING_DOCUMENT_PREFIX = "search_document: "
EMBEDDING_QUERY_PREFIX = "search_query: "

# --- Vector store ---
# Local dev (default): ChromaDB, persisted on disk — no external service needed.
# Deployed on Vercel: Upstash Vector (hosted embedding, dense+sparse hybrid) in
# its own namespace — selected automatically when its env vars are present,
# since Vercel's ephemeral filesystem can't hold a persistent Chroma DB and
# sentence-transformers (torch) is far too large for a serverless function
# bundle (same constraint hit while deploying AdvancedRAG). See vectorstore.py.
CHROMA_PATH = str(BACKEND_DIR / "chroma_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "vwo_prd")

UPSTASH_VECTOR_REST_URL = os.getenv("UPSTASH_VECTOR_REST_URL", "")
UPSTASH_VECTOR_REST_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN", "")
UPSTASH_NAMESPACE = os.getenv("UPSTASH_NAMESPACE", "basicrag")
VECTOR_BACKEND = "upstash" if UPSTASH_VECTOR_REST_URL else "chroma"

# --- Retrieval ---
TOP_K = int(os.getenv("TOP_K", "4"))

# --- LLM (Groq) ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
