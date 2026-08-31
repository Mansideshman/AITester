import sys
from pathlib import Path

# Re-export the FastAPI app defined in backend/app/main.py for Vercel's
# Python runtime to discover (it auto-detects an ASGI `app` object).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402,F401
