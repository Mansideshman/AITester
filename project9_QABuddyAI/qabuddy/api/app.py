from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routes import router

app = FastAPI(title="QABuddyAI", description="Multi-source hybrid-RAG QA assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

# Serves the built React frontend (frontend/dist) if it exists, so a single
# uvicorn process can serve both the API and the UI in production. Mounted
# after the /api router so API routes still resolve first; absent in
# backend-only dev (no build has been run yet), which is not an error.
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
