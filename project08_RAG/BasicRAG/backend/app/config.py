import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")

# --- Source data ---
DATA_DIR = PROJECT_DIR / "data"
DEFAULT_SOURCE_PATH = Path(
    os.getenv("PDF_PATH", str(DATA_DIR / "Product Requirements Document_(PRD)_VWO.com.pdf"))
)

# --- Uploads ---
UPLOAD_DIR = BACKEND_DIR / "uploads"
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".txt", ".md", ".doc", ".docx"}
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "20"))

# --- Chunking ---
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))

# --- Embeddings (Nomic Embed, run locally via sentence-transformers) ---
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-ai/nomic-embed-text-v1.5")
EMBEDDING_DOCUMENT_PREFIX = "search_document: "
EMBEDDING_QUERY_PREFIX = "search_query: "

# --- Vector store (local ChromaDB) ---
CHROMA_PATH = str(BACKEND_DIR / "chroma_db")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "vwo_prd")

# --- Retrieval ---
TOP_K = int(os.getenv("TOP_K", "4"))

# --- LLM (Groq) ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
