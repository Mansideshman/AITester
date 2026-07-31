from __future__ import annotations

import json
import os
import statistics
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request

from rag import chunking, config, docs, llm, rerank

app = Flask(__name__)

# ---------------------------------------------------------------------------
# The only piece of server-side state left: which chunks were cited in the
# most recent chat answer, purely so /chunks can outline them. Best-effort —
# on Vercel a different warm instance may not share this, which just means
# the highlight silently doesn't show; nothing depends on it being correct.
# ---------------------------------------------------------------------------
LAST_CHAT_CHUNK_IDS: list[int] = []


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("upload.html", active="upload")


@app.route("/upload")
def upload_page():
    return render_template("upload.html", active="upload")


@app.route("/chunks")
def chunks_page():
    return render_template("chunks.html", active="chunks")


@app.route("/chat")
def chat_page():
    return render_template("chat.html", active="chat")


# ---------------------------------------------------------------------------
# Upload preview (stateless — parses in-memory, persists nothing server-side;
# the browser re-sends the same file when it calls /api/ingest)
# ---------------------------------------------------------------------------
@app.route("/api/upload", methods=["POST"])
def api_upload():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "No file provided"}), 400

    suffix = Path(file.filename).suffix.lower()
    if suffix not in config.ALLOWED_UPLOAD_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type: {suffix}"}), 400

    try:
        df = docs.load_table_from_upload(file)
    except Exception as exc:
        return jsonify({"error": f"Failed to parse file: {exc}"}), 400

    return jsonify(docs.preview(df))


# ---------------------------------------------------------------------------
# Ingest — one request, streamed. Backend-specific generators below.
# ---------------------------------------------------------------------------
def _chunk_stage_payload(chunk_records: list[dict]) -> dict:
    lengths = [len(c["text"]) for c in chunk_records] or [0]
    hist_bins = [0] * 10
    max_len = max(lengths) or 1
    for l in lengths:
        idx = min(int(l / max_len * 10), 9)
        hist_bins[idx] += 1
    return {
        "stage": "chunk", "status": "done",
        "total_chunks": len(chunk_records),
        "avg_chars": round(statistics.mean(lengths), 1),
        "min_chars": min(lengths), "max_chars": max(lengths),
        "histogram": hist_bins,
        "samples": [
            {"chunk_id": c["chunk_id"], "text": c["text"][:280],
             "overlap_preview": c["text"][:config.CHUNK_OVERLAP]}
            for c in chunk_records[:5]
        ],
    }


def _ingest_stream_qdrant(df, text_cols, meta_cols):
    from rag import embeddings, vectorstore

    try:
        yield _sse("stage", {"stage": "read", "status": "done", "row_count": len(df)})

        yield _sse("stage", {"stage": "build", "status": "running"})
        assembled = docs.assemble_docs(df, text_cols, meta_cols)
        yield _sse("stage", {"stage": "build", "status": "done", "doc_count": len(assembled)})

        yield _sse("stage", {"stage": "chunk", "status": "running"})
        chunk_records = chunking.chunk_docs(assembled)
        yield _sse("stage", _chunk_stage_payload(chunk_records))

        yield _sse("stage", {"stage": "embed", "status": "running", "total": len(chunk_records)})
        texts = [c["text"] for c in chunk_records]
        all_dense, all_sparse = [], []
        batch_size = config.INGEST_BATCH
        total = len(texts)
        for start in range(0, total, batch_size):
            batch = texts[start:start + batch_size]
            result = embeddings.embed_batch(batch)
            all_dense.extend(result["dense"])
            all_sparse.extend(result["sparse"])
            yield _sse("progress", {"stage": "embed", "done": min(start + batch_size, total), "total": total})

        sample_dense = all_dense[0][:8] if all_dense else []
        sample_sparse = embeddings.sparse_preview(all_sparse[0]) if all_sparse else []
        yield _sse("stage", {
            "stage": "embed", "status": "done",
            "dense_preview": sample_dense, "sparse_preview": sample_sparse,
        })

        yield _sse("stage", {"stage": "index", "status": "running"})
        vectorstore.recreate_collection()
        vectorstore.upsert_chunks(chunk_records, all_dense, all_sparse)
        info = vectorstore.collection_info()
        yield _sse("stage", {"stage": "index", "status": "done", "collection": info})

    except Exception as exc:
        yield _sse("error", {"message": str(exc)})
    finally:
        yield _sse("done", {})


def _ingest_stream_upstash(df, text_cols, meta_cols):
    from rag import upstash_store

    try:
        yield _sse("stage", {"stage": "read", "status": "done", "row_count": len(df)})

        yield _sse("stage", {"stage": "build", "status": "running"})
        assembled = docs.assemble_docs(df, text_cols, meta_cols)
        yield _sse("stage", {"stage": "build", "status": "done", "doc_count": len(assembled)})

        yield _sse("stage", {"stage": "chunk", "status": "running"})
        chunk_records = chunking.chunk_docs(assembled)
        yield _sse("stage", _chunk_stage_payload(chunk_records))

        yield _sse("stage", {"stage": "embed", "status": "running", "total": len(chunk_records)})
        yield _sse("stage", {
            "stage": "embed", "status": "done",
            "dense_preview": [], "sparse_preview": [],
            "note": "Upstash Vector computes dense + sparse (BM25) vectors server-side from raw "
                    "text on upsert — no local embedding model runs in this deployment.",
        })

        yield _sse("stage", {"stage": "index", "status": "running"})
        upstash_store.recreate_collection()
        upstash_store.upsert_chunks(chunk_records)
        info = upstash_store.collection_info()
        yield _sse("stage", {"stage": "index", "status": "done", "collection": info})

    except Exception as exc:
        yield _sse("error", {"message": str(exc)})
    finally:
        yield _sse("done", {})


@app.route("/api/ingest", methods=["POST"])
def api_ingest():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "No file provided"}), 400
    text_cols = request.form.getlist("text_cols")
    meta_cols = request.form.getlist("meta_cols")
    if not text_cols:
        return jsonify({"error": "Pick at least one text column"}), 400

    try:
        df = docs.load_table_from_upload(file)
    except Exception as exc:
        return jsonify({"error": f"Failed to parse file: {exc}"}), 400

    generator = _ingest_stream_upstash(df, text_cols, meta_cols) if config.VECTOR_BACKEND == "upstash" \
        else _ingest_stream_qdrant(df, text_cols, meta_cols)
    return Response(generator, mimetype="text/event-stream")


# ---------------------------------------------------------------------------
# Chunks browser
# ---------------------------------------------------------------------------
@app.route("/api/chunks/facets")
def api_chunks_facets():
    if config.VECTOR_BACKEND == "upstash":
        from rag import upstash_store
        if not upstash_store.collection_exists():
            return jsonify({"priority": [], "module": []})
        points = upstash_store.list_all_chunks()
        priorities = sorted({p["payload"].get("priority") for p in points if p["payload"].get("priority")})
        modules = sorted({p["payload"].get("module") for p in points if p["payload"].get("module")})
        return jsonify({"priority": priorities, "module": modules})

    from rag import vectorstore
    if not vectorstore.collection_exists():
        return jsonify({"priority": [], "module": []})
    priorities, modules = set(), set()
    offset = None
    while True:
        batch, offset = vectorstore.scroll_chunks(offset=offset, limit=512, filters=None)
        for p in batch:
            if p.payload.get("priority"):
                priorities.add(p.payload["priority"])
            if p.payload.get("module"):
                modules.add(p.payload["module"])
        if offset is None:
            break
    return jsonify({"priority": sorted(priorities), "module": sorted(modules)})


@app.route("/api/chunks")
def api_chunks():
    from rag import embeddings

    page = int(request.args.get("page", 0))
    page_size = 50
    filters = {
        "search": request.args.get("search", ""),
        "priority": request.args.get("priority", ""),
        "module": request.args.get("module", ""),
        "jira_id": request.args.get("jira_id", ""),
    }
    last_used = set(LAST_CHAT_CHUNK_IDS)

    if config.VECTOR_BACKEND == "upstash":
        from rag import upstash_store
        if not upstash_store.collection_exists():
            return jsonify({"chunks": [], "total": 0, "page": page, "page_size": page_size})

        if not any(filters.values()):
            info = upstash_store.collection_info()
            total = info.get("points_count", 0)
            start = page * page_size
            ids = list(range(start, min(start + page_size, total)))
            points = upstash_store.get_by_ids(ids) if ids else []
        else:
            points = upstash_store.list_all_chunks(filters=filters)
            total = len(points)
            start = page * page_size
            points = points[start:start + page_size]

        out = []
        for p in points:
            payload = dict(p["payload"])
            text = payload.pop("text", "")
            out.append({
                "id": p["id"], "text": text, "meta": payload,
                "dense_preview": [], "sparse_preview": [],
                "used_in_last_answer": p["id"] in last_used,
            })
        return jsonify({"chunks": out, "total": total, "page": page, "page_size": page_size})

    from rag import vectorstore
    if not vectorstore.collection_exists():
        return jsonify({"chunks": [], "total": 0, "page": page, "page_size": page_size})

    if not any(filters.values()):
        info = vectorstore.collection_info()
        total = info.get("points_count", 0)
        start = page * page_size
        ids = list(range(start, min(start + page_size, total)))
        points = vectorstore.get_by_ids(ids) if ids else []
    else:
        all_points = []
        offset = None
        while True:
            batch, offset = vectorstore.scroll_chunks(offset=offset, limit=256, filters=filters, with_vectors=True)
            all_points.extend(batch)
            if offset is None:
                break
        total = len(all_points)
        start = page * page_size
        points = all_points[start:start + page_size]

    out = []
    for p in points:
        payload = dict(p.payload or {})
        text = payload.pop("text", "")
        dense_preview, sparse_preview = [], []
        if p.vector:
            dense = p.vector.get(vectorstore.DENSE_VEC_NAME) or []
            dense_preview = [round(v, 4) for v in dense[:8]]
            sparse = p.vector.get(vectorstore.SPARSE_VEC_NAME)
            if sparse is not None:
                sparse_dict = dict(zip(sparse.indices, sparse.values))
                sparse_preview = embeddings.sparse_preview(sparse_dict)
        out.append({
            "id": p.id, "text": text, "meta": payload,
            "dense_preview": dense_preview, "sparse_preview": sparse_preview,
            "used_in_last_answer": p.id in last_used,
        })
    return jsonify({"chunks": out, "total": total, "page": page, "page_size": page_size})


# ---------------------------------------------------------------------------
# Chat — one request, streamed. Backend-specific generators below.
# ---------------------------------------------------------------------------
def _rrf_merge(hit_lists: list[list[dict]], k: int = None, top_n: int = None) -> list[dict]:
    """RRF over several already-ranked hit lists (plain {id, score, payload}
    dicts), used to merge results across the N query rewrites."""
    k = k if k is not None else config.RRF_K
    scores, payloads = {}, {}
    for hits in hit_lists:
        for rank, hit in enumerate(hits, start=1):
            scores[hit["id"]] = scores.get(hit["id"], 0.0) + 1.0 / (k + rank)
            payloads[hit["id"]] = hit["payload"]
    fused = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    if top_n:
        fused = fused[:top_n]
    return [{"id": pid, "score": score, "payload": payloads[pid]} for pid, score in fused]


def _preview_hits(hits: list[dict]) -> list[dict]:
    return [{"id": h["id"], "score": round(h["score"], 4), "text": h["payload"].get("text", "")[:160]} for h in hits]


def _chat_stream_qdrant(question: str):
    from rag import embeddings, vectorstore

    def merge_qdrant_hits(hit_lists):
        best_rank, payloads = {}, {}
        for hits in hit_lists:
            for rank, hit in enumerate(hits, start=1):
                if hit.id not in best_rank or rank < best_rank[hit.id]:
                    best_rank[hit.id] = rank
                payloads[hit.id] = hit.payload
        ordered = sorted(best_rank.items(), key=lambda kv: kv[1])
        return [{"id": pid, "payload": payloads[pid]} for pid, _ in ordered]

    try:
        mode = llm.detect_mode(question)
        yield _sse("stage", {"stage": "rewrite", "status": "running"})
        rewrites = llm.rewrite_query(question)
        yield _sse("stage", {"stage": "rewrite", "status": "done", "rewrites": rewrites, "mode": mode})

        yield _sse("stage", {"stage": "retrieve", "status": "running"})
        all_dense, all_sparse = [], []
        for q in rewrites:
            qvec = embeddings.embed_query(q)
            all_dense.append(vectorstore.dense_search(qvec["dense"], config.TOP_N_HYBRID))
            all_sparse.append(vectorstore.sparse_search(qvec["sparse"], config.TOP_N_HYBRID))
        dense_preview = [{"id": h.id, "score": h.score, "payload": h.payload} for h in (all_dense[0] if all_dense else [])]
        sparse_preview = [{"id": h.id, "score": h.score, "payload": h.payload} for h in (all_sparse[0] if all_sparse else [])]

        # merge each search-type's hits across rewrites (best rank), then fuse dense+sparse
        merged_dense_dicts = merge_qdrant_hits(all_dense)
        merged_sparse_dicts = merge_qdrant_hits(all_sparse)
        fused = _rrf_dense_sparse(merged_dense_dicts, merged_sparse_dicts, top_n=config.TOP_N_HYBRID)
        yield _sse("stage", {
            "stage": "retrieve", "status": "done",
            "dense_top": _preview_hits(dense_preview[:10]),
            "sparse_top": _preview_hits(sparse_preview[:10]),
            "fused_top": _preview_hits(fused[:10]),
        })

        yield _sse("stage", {"stage": "rerank", "status": "running"})
        before = fused[:config.TOP_N_HYBRID]
        after = rerank.rerank(question, [dict(f) for f in before], top_k=config.TOP_K_RERANK)
        yield _sse("stage", {
            "stage": "rerank", "status": "done",
            "before": _preview_hits(before[:10]),
            "after": [{"id": f["id"], "score": round(f["rerank_score"], 4), "text": f["payload"].get("text", "")[:160]} for f in after],
        })

        yield from _generate_and_finish(question, mode, after)

    except Exception as exc:
        yield _sse("error", {"message": str(exc)})
        yield _sse("done", {})


def _rrf_dense_sparse(dense_hits: list[dict], sparse_hits: list[dict], k: int = None, top_n: int = None) -> list[dict]:
    k = k if k is not None else config.RRF_K
    scores, payloads = {}, {}
    for rank, hit in enumerate(dense_hits, start=1):
        scores[hit["id"]] = scores.get(hit["id"], 0.0) + 1.0 / (k + rank)
        payloads[hit["id"]] = hit["payload"]
    for rank, hit in enumerate(sparse_hits, start=1):
        scores[hit["id"]] = scores.get(hit["id"], 0.0) + 1.0 / (k + rank)
        payloads[hit["id"]] = hit["payload"]
    fused = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    if top_n:
        fused = fused[:top_n]
    return [{"id": pid, "score": score, "payload": payloads[pid]} for pid, score in fused]


def _chat_stream_upstash(question: str):
    from rag import upstash_store

    try:
        mode = llm.detect_mode(question)
        yield _sse("stage", {"stage": "rewrite", "status": "running"})
        rewrites = llm.rewrite_query(question)
        yield _sse("stage", {"stage": "rewrite", "status": "done", "rewrites": rewrites, "mode": mode})

        yield _sse("stage", {"stage": "retrieve", "status": "running"})
        per_rewrite_hits = [upstash_store.hybrid_query(q, config.TOP_N_HYBRID) for q in rewrites]
        fused = _rrf_merge(per_rewrite_hits, top_n=config.TOP_N_HYBRID)
        yield _sse("stage", {
            "stage": "retrieve", "status": "done",
            "dense_top": [], "sparse_top": [],  # Upstash fuses dense+sparse server-side in one call
            "fused_top": _preview_hits(fused[:10]),
        })

        yield _sse("stage", {"stage": "rerank", "status": "running"})
        before = fused[:config.TOP_N_HYBRID]
        after = rerank.rerank(question, [dict(f) for f in before], top_k=config.TOP_K_RERANK)
        yield _sse("stage", {
            "stage": "rerank", "status": "done",
            "before": _preview_hits(before[:10]),
            "after": [{"id": f["id"], "score": round(f["rerank_score"], 4), "text": f["payload"].get("text", "")[:160]} for f in after],
        })

        yield from _generate_and_finish(question, mode, after)

    except Exception as exc:
        yield _sse("error", {"message": str(exc)})
        yield _sse("done", {})


def _generate_and_finish(question, mode, after):
    yield _sse("stage", {"stage": "generate", "status": "running"})
    answer = llm.generate_test_case(question, after) if mode == "generate" else llm.generate_answer(question, after)
    cited_ids = [f["id"] for f in after]
    LAST_CHAT_CHUNK_IDS[:] = cited_ids
    yield _sse("stage", {"stage": "generate", "status": "done", "answer": answer, "mode": mode, "cited_ids": cited_ids})
    yield _sse("done", {})


@app.route("/api/chat", methods=["POST"])
def api_chat():
    body = request.get_json(force=True) or {}
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400

    if config.VECTOR_BACKEND == "upstash":
        from rag import upstash_store
        ready = upstash_store.collection_exists()
    else:
        from rag import vectorstore
        ready = vectorstore.collection_exists()
    if not ready:
        return jsonify({"error": "No data ingested yet — go to /upload first"}), 400

    generator = _chat_stream_upstash(question) if config.VECTOR_BACKEND == "upstash" else _chat_stream_qdrant(question)
    return Response(generator, mimetype="text/event-stream")


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
@app.route("/api/status")
def api_status():
    if config.VECTOR_BACKEND == "upstash":
        from rag import upstash_store
        info = upstash_store.collection_info()
    else:
        from rag import vectorstore
        info = vectorstore.collection_info()
    return jsonify({
        "collection": info,
        "llm_provider": config.LLM_PROVIDER,
        "vector_backend": config.VECTOR_BACKEND,
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5050"))
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
