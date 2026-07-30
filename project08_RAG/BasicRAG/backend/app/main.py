from __future__ import annotations

import sys

try:
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except ImportError:
    pass  # falls back to the system sqlite3 (must be >= 3.35.0 for ChromaDB)

import logging
import threading
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config, pipeline
from .document_loader import UnsupportedDocumentError
from .llm import GroqNotConfiguredError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag-explorer")

config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="RAG Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


@app.on_event("startup")
def startup_ingest() -> None:
    def _run():
        try:
            logger.info("Starting automatic PDF ingestion...")
            pipeline.ingest()
            logger.info("Ingestion complete.")
        except Exception:  # noqa: BLE001
            logger.exception("Ingestion failed")

    threading.Thread(target=_run, daemon=True).start()


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/status")
def status():
    return pipeline.get_status()


@app.get("/api/chunks")
def chunks():
    return {"chunks": pipeline.get_chunks()}


@app.post("/api/ingest")
def ingest():
    try:
        return pipeline.ingest(force=True)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/upload")
def upload(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(filename).suffix.lower()
    if ext not in config.ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{ext}'. Allowed: "
                f"{', '.join(sorted(config.ALLOWED_UPLOAD_EXTENSIONS))}"
            ),
        )

    contents = file.file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > config.MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Max {config.MAX_UPLOAD_MB} MB.",
        )
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    dest = config.UPLOAD_DIR / filename
    dest.write_bytes(contents)

    try:
        return pipeline.ingest(force=True, source_path=dest)
    except UnsupportedDocumentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Upload ingestion failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/reset")
def reset():
    try:
        return pipeline.reset()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/query")
def query(req: QueryRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question must not be empty")
    try:
        return pipeline.answer_question(question)
    except GroqNotConfiguredError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Query failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
