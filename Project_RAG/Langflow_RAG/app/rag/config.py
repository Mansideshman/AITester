import os
from pathlib import Path

from dotenv import load_dotenv

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = APP_DIR.parent

load_dotenv(APP_DIR / ".env")

# --- Source data ---
# Mirrors the exported Langflow flow's `File` component — the same 500-row
# VWO test case CSV used to exercise the two flows in this folder.
DEFAULT_CSV_PATH = PROJECT_DIR / "VWO_Test_Cases_500.csv"
TEXT_COLS = ["Scenario", "Test Case", "Expected Result"]
META_COLS = ["Test Case ID", "Scenario"]

# --- Chunking ---
# The flow's `SplitText` component; test cases are short, so most rows fit
# in a single chunk (matches the flow's default chunk size).
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))

# --- Vector store ---
# The flow uses OpenAIEmbeddings -> Chroma. This app uses Upstash Vector's
# hosted embeddings instead (no OpenAI key needed, and no local ML model —
# same reasoning as AdvancedRAG/BasicRAG's Vercel deployments), in its own
# namespace so it can share one free-tier Upstash index with those projects.
UPSTASH_VECTOR_REST_URL = os.getenv("UPSTASH_VECTOR_REST_URL", "")
UPSTASH_VECTOR_REST_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN", "")
UPSTASH_NAMESPACE = os.getenv("UPSTASH_NAMESPACE", "naive-rag")

# --- Retrieval ---
TOP_K = int(os.getenv("TOP_K", "4"))

# --- LLM (Groq) ---
# The flow's OpenAIModel component; substituted with Groq for the same
# reason as the other projects in this repo (no OpenAI key provisioned).
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
