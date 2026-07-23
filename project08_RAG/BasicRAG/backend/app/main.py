from __future__ import annotations

import sys

try:
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
except ImportError:
    pass  # falls back to the system sqlite3 (must be >= 3.35.0 for ChromaDB)

import logging
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import pipeline
from .llm import GroqNotConfiguredError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag-explorer")

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
