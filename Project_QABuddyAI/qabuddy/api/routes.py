from __future__ import annotations

import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from .. import config, embeddings, ingest, llm, rerank, vectorstore
from .schemas import ChatRequest, HealthResponse, SourceStatus, UploadResponse

router = APIRouter()


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "vector_backend": "qdrant",
        "collection": vectorstore.collection_info(),
        "llm_provider": config.LLM_PROVIDER,
    }


@router.get("/sources", response_model=List[SourceStatus])
def sources():
    state = ingest.get_state()
    result = []
    for source_type, meta in config.SOURCE_TYPES.items():
        entry = state.get(source_type, {})
        result.append({
            "source_type": source_type,
            "folder": f"data/{meta['folder']}",
            "chunk_count": entry.get("chunk_count", 0),
            "last_ingested_at": entry.get("last_ingested_at"),
            "status": "ingested" if entry else "not_ingested",
        })
    result.append({
        "source_type": "figma_design", "folder": "data/figma_designs",
        "chunk_count": 0, "last_ingested_at": None, "status": "not_implemented_phase2",
    })
    return result


def _source_folder(source_type: str) -> Path:
    if source_type == "figma_design":
        raise HTTPException(404, "figma_design is a phase 2 source — no loader implemented yet")
    if source_type not in config.SOURCE_TYPES:
        raise HTTPException(404, f"Unknown source_type '{source_type}'. Known: {list(config.SOURCE_TYPES)}")
    return config.DATA_DIR / config.SOURCE_TYPES[source_type]["folder"]


@router.post("/sources/{source_type}/upload", response_model=UploadResponse)
async def upload_files(source_type: str, files: List[UploadFile] = File(...)):
    folder = _source_folder(source_type)
    folder.mkdir(parents=True, exist_ok=True)

    saved = []
    for f in files:
        # Path(...).name strips any directory components the client sent,
        # so an upload can't write outside `folder` (e.g. via "../../etc/passwd").
        name = Path(f.filename or "").name
        if not name:
            continue
        (folder / name).write_bytes(await f.read())
        saved.append(name)

    return {"source_type": source_type, "saved_files": saved}


@router.post("/ingest/{source_type}")
async def ingest_one(source_type: str):
    _source_folder(source_type)  # validates source_type, raises 404 if unknown/phase-2

    def stream():
        for event in ingest.ingest_source_stream(source_type):
            yield _sse("stage", event)
        yield _sse("done", {"source_type": source_type})

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/ingest")
async def ingest_all():
    def stream():
        for event in ingest.ingest_all_stream():
            yield _sse("stage", event)
        yield _sse("done", {})

    return StreamingResponse(stream(), media_type="text/event-stream")


def _merge_hits_across_rewrites(hit_lists: list[list]) -> list[dict]:
    """Merges each rewrite's ranked hits by best rank, so a chunk surfaced
    highly by any one rewrite keeps that rank rather than being diluted."""
    best_rank, payloads = {}, {}
    for hits in hit_lists:
        for rank, hit in enumerate(hits, start=1):
            if hit.id not in best_rank or rank < best_rank[hit.id]:
                best_rank[hit.id] = rank
            payloads[hit.id] = hit.payload
    ordered = sorted(best_rank.items(), key=lambda kv: kv[1])
    return [{"id": pid, "payload": payloads[pid]} for pid, _ in ordered]


def _rrf_dicts(dense_hits: list[dict], sparse_hits: list[dict], top_n: int) -> list[dict]:
    scores, payloads = {}, {}
    for rank, hit in enumerate(dense_hits, start=1):
        scores[hit["id"]] = scores.get(hit["id"], 0.0) + 1.0 / (config.RRF_K + rank)
        payloads[hit["id"]] = hit["payload"]
    for rank, hit in enumerate(sparse_hits, start=1):
        scores[hit["id"]] = scores.get(hit["id"], 0.0) + 1.0 / (config.RRF_K + rank)
        payloads[hit["id"]] = hit["payload"]
    fused = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    return [{"id": pid, "score": score, "payload": payloads[pid]} for pid, score in fused]


def _chat_stream(question: str, source_types: list[str] | None, top_k: int | None):
    try:
        filters = {"source_types": source_types} if source_types else None

        yield _sse("stage", {"stage": "rewrite"})
        rewrites = llm.rewrite_query(question)
        yield _sse("stage", {"stage": "rewrite", "rewrites": rewrites})

        yield _sse("stage", {"stage": "retrieve"})
        all_dense, all_sparse = [], []
        for q in rewrites:
            qvec = embeddings.embed_query(q)
            all_dense.append(vectorstore.dense_search(qvec["dense"], config.TOP_N_HYBRID, filters))
            all_sparse.append(vectorstore.sparse_search(qvec["sparse"], config.TOP_N_HYBRID, filters))
        merged_dense = _merge_hits_across_rewrites(all_dense)
        merged_sparse = _merge_hits_across_rewrites(all_sparse)
        fused = _rrf_dicts(merged_dense, merged_sparse, top_n=config.TOP_N_HYBRID)
        yield _sse("stage", {"stage": "retrieve", "candidate_count": len(fused)})

        yield _sse("stage", {"stage": "rerank"})
        top = rerank.rerank(question, [dict(f) for f in fused], top_k=top_k or config.TOP_K_RERANK)
        yield _sse("stage", {"stage": "rerank", "kept": len(top)})

        yield _sse("stage", {"stage": "generate"})
        if not top:
            answer = "I couldn't find anything relevant in the ingested sources to answer that."
            citations = []
        else:
            answer = llm.generate_answer(question, top)
            citations = [
                {
                    "source_type": c["payload"].get("source_type", "unknown"),
                    "label": llm.format_citation(c["payload"]),
                    "score": round(c.get("rerank_score", c.get("score", 0.0)), 4),
                    "source_id": c["payload"].get("source_id", ""),
                }
                for c in top
            ]

        yield _sse("generate", {"answer": answer, "citations": citations})
        yield _sse("done", {})
    except Exception as exc:
        yield _sse("error", {"message": str(exc)})
        yield _sse("done", {})


@router.post("/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(
        _chat_stream(req.question, req.source_types, req.top_k), media_type="text/event-stream"
    )
