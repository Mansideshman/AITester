from __future__ import annotations

import json
import os
import queue
import statistics
import threading
import uuid
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request

from rag import chunking, config, docs, embeddings, llm, rerank, vectorstore

app = Flask(__name__)

# ---------------------------------------------------------------------------
# In-memory app state. This is a small single-user teaching demo (same scope
# as BasicRAG), so a couple of module-level dicts stand in for a real
# session/job store.
# ---------------------------------------------------------------------------
STATE = {
    "upload_path": None,
    "df_preview": None,
    "columns": [],
    "text_cols": [],
    "meta_cols": [],
    "jobs": {},          # job_id -> {"queue": Queue, "thread": Thread, "done": bool}
    "last_chat_chunk_ids": [],
}


def new_job() -> str:
    job_id = uuid.uuid4().hex[:12]
    STATE["jobs"][job_id] = {"queue": queue.Queue(), "done": False}
    return job_id


def emit(job_id: str, event: str, data: dict):
    STATE["jobs"][job_id]["queue"].put({"event": event, "data": data})


def finish_job(job_id: str):
    STATE["jobs"][job_id]["done"] = True
    STATE["jobs"][job_id]["queue"].put(None)  # sentinel


def sse_stream(job_id: str):
    q = STATE["jobs"][job_id]["queue"]
    while True:
        item = q.get()
        if item is None:
            yield "event: done\ndata: {}\n\n"
            break
        yield f"event: {item['event']}\ndata: {json.dumps(item['data'])}\n\n"


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("upload.html", active="upload")


@app.route("/upload")
def upload_page():
    return render_template("upload.html", active="upload")


@app.route("/ingest")
def ingest_page():
    return render_template(
        "ingest.html",
        active="ingest",
        columns=STATE["columns"],
        text_cols=STATE["text_cols"],
        meta_cols=STATE["meta_cols"],
        has_upload=STATE["upload_path"] is not None,
    )


@app.route("/api/select-columns", methods=["POST"])
def api_select_columns():
    body = request.get_json(force=True)
    STATE["text_cols"] = body.get("text_cols") or []
    STATE["meta_cols"] = body.get("meta_cols") or []
    return jsonify({"ok": True})


@app.route("/chunks")
def chunks_page():
    return render_template("chunks.html", active="chunks")


@app.route("/chat")
def chat_page():
    return render_template("chat.html", active="chat")


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
@app.route("/api/upload", methods=["POST"])
def api_upload():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "No file provided"}), 400

    suffix = Path(file.filename).suffix.lower()
    if suffix not in config.ALLOWED_UPLOAD_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type: {suffix}"}), 400

    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = config.UPLOAD_DIR / file.filename
    file.save(dest)

    try:
        df = docs.load_table(dest)
    except Exception as exc:
        return jsonify({"error": f"Failed to parse file: {exc}"}), 400

    STATE["upload_path"] = str(dest)
    STATE["columns"] = list(df.columns)
    preview = docs.preview(df)
    STATE["df_preview"] = preview
    return jsonify(preview)


# ---------------------------------------------------------------------------
# Ingest (SSE)
# ---------------------------------------------------------------------------
def _run_ingest(job_id: str, text_cols: list[str], meta_cols: list[str]):
    try:
        emit(job_id, "stage", {"stage": "read", "status": "running"})
        df = docs.load_table(Path(STATE["upload_path"]))
        emit(job_id, "stage", {"stage": "read", "status": "done", "row_count": len(df)})

        emit(job_id, "stage", {"stage": "build", "status": "running"})
        assembled = docs.assemble_docs(df, text_cols, meta_cols)
        emit(job_id, "stage", {"stage": "build", "status": "done", "doc_count": len(assembled)})

        emit(job_id, "stage", {"stage": "chunk", "status": "running"})
        chunk_records = chunking.chunk_docs(assembled)
        lengths = [len(c["text"]) for c in chunk_records] or [0]
        hist_bins = [0] * 10
        max_len = max(lengths) or 1
        for l in lengths:
            idx = min(int(l / max_len * 10), 9)
            hist_bins[idx] += 1
        emit(job_id, "stage", {
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
        })

        emit(job_id, "stage", {"stage": "embed", "status": "running", "total": len(chunk_records)})
        texts = [c["text"] for c in chunk_records]

        def on_batch(done, total):
            emit(job_id, "progress", {"stage": "embed", "done": done, "total": total})

        vectors = embeddings.embed_texts(texts, on_batch=on_batch)
        sample_dense = vectors["dense"][0][:8] if vectors["dense"] else []
        sample_sparse = embeddings.sparse_preview(vectors["sparse"][0]) if vectors["sparse"] else []
        emit(job_id, "stage", {
            "stage": "embed", "status": "done",
            "dense_preview": sample_dense, "sparse_preview": sample_sparse,
        })

        emit(job_id, "stage", {"stage": "index", "status": "running"})
        vectorstore.recreate_collection()
        vectorstore.upsert_chunks(chunk_records, vectors["dense"], vectors["sparse"])
        info = vectorstore.collection_info()
        emit(job_id, "stage", {"stage": "index", "status": "done", "collection": info})

    except Exception as exc:
        emit(job_id, "error", {"message": str(exc)})
    finally:
        finish_job(job_id)


@app.route("/api/ingest/start", methods=["POST"])
def api_ingest_start():
    if not STATE["upload_path"]:
        return jsonify({"error": "Upload a file first"}), 400
    body = request.get_json(force=True) or {}
    text_cols = body.get("text_cols") or STATE["text_cols"]
    meta_cols = body.get("meta_cols") or STATE["meta_cols"]
    if not text_cols:
        return jsonify({"error": "Pick at least one text column"}), 400

    job_id = new_job()
    thread = threading.Thread(target=_run_ingest, args=(job_id, text_cols, meta_cols), daemon=True)
    STATE["jobs"][job_id]["thread"] = thread
    thread.start()
    return jsonify({"job_id": job_id})


@app.route("/api/ingest/stream/<job_id>")
def api_ingest_stream(job_id):
    if job_id not in STATE["jobs"]:
        return jsonify({"error": "unknown job"}), 404
    return Response(sse_stream(job_id), mimetype="text/event-stream")


# ---------------------------------------------------------------------------
# Chunks browser
# ---------------------------------------------------------------------------
@app.route("/api/chunks/facets")
def api_chunks_facets():
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
    page = int(request.args.get("page", 0))
    page_size = 50
    filters = {
        "search": request.args.get("search", ""),
        "priority": request.args.get("priority", ""),
        "module": request.args.get("module", ""),
        "jira_id": request.args.get("jira_id", ""),
    }

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

    last_used = set(STATE["last_chat_chunk_ids"])
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
            "id": p.id,
            "text": text,
            "meta": payload,
            "dense_preview": dense_preview,
            "sparse_preview": sparse_preview,
            "used_in_last_answer": p.id in last_used,
        })
    return jsonify({"chunks": out, "total": total, "page": page, "page_size": page_size})


# ---------------------------------------------------------------------------
# Chat (SSE)
# ---------------------------------------------------------------------------
def _run_chat(job_id: str, question: str):
    try:
        mode = llm.detect_mode(question)
        emit(job_id, "stage", {"stage": "rewrite", "status": "running"})
        rewrites = llm.rewrite_query(question)
        emit(job_id, "stage", {"stage": "rewrite", "status": "done", "rewrites": rewrites, "mode": mode})

        emit(job_id, "stage", {"stage": "retrieve", "status": "running"})
        all_dense, all_sparse = [], []
        for q in rewrites:
            qvec = embeddings.embed_query(q)
            all_dense.append(vectorstore.dense_search(qvec["dense"], config.TOP_N_HYBRID))
            all_sparse.append(vectorstore.sparse_search(qvec["sparse"], config.TOP_N_HYBRID))
        dense_hits = all_dense[0] if all_dense else []
        sparse_hits = all_sparse[0] if all_sparse else []
        # merge rewrite hit lists (dense/sparse each) before fusing, de-duped by id/best rank
        merged_dense = _merge_hit_lists(all_dense)
        merged_sparse = _merge_hit_lists(all_sparse)
        fused = vectorstore.rrf_fuse(merged_dense, merged_sparse, top_n=config.TOP_N_HYBRID)
        emit(job_id, "stage", {
            "stage": "retrieve", "status": "done",
            "dense_top": _hits_preview(dense_hits[:10]),
            "sparse_top": _hits_preview(sparse_hits[:10]),
            "fused_top": [{"id": f["id"], "score": round(f["score"], 4), "text": f["payload"].get("text", "")[:160]} for f in fused[:10]],
        })

        emit(job_id, "stage", {"stage": "rerank", "status": "running"})
        before = fused[:config.TOP_N_HYBRID]
        after = rerank.rerank(question, [dict(f) for f in before], top_k=config.TOP_K_RERANK)
        emit(job_id, "stage", {
            "stage": "rerank", "status": "done",
            "before": [{"id": f["id"], "score": round(f["score"], 4), "text": f["payload"].get("text", "")[:160]} for f in before[:10]],
            "after": [{"id": f["id"], "score": round(f["rerank_score"], 4), "text": f["payload"].get("text", "")[:160]} for f in after],
        })

        emit(job_id, "stage", {"stage": "generate", "status": "running"})
        if mode == "generate":
            answer = llm.generate_test_case(question, after)
        else:
            answer = llm.generate_answer(question, after)
        cited_ids = [f["id"] for f in after]
        STATE["last_chat_chunk_ids"] = cited_ids
        emit(job_id, "stage", {"stage": "generate", "status": "done", "answer": answer, "mode": mode, "cited_ids": cited_ids})

    except Exception as exc:
        emit(job_id, "error", {"message": str(exc)})
    finally:
        finish_job(job_id)


def _merge_hit_lists(hit_lists):
    """Flatten multiple ranked hit lists (one per query rewrite) into one,
    keeping each point's best (lowest) rank across all lists."""
    best_rank = {}
    payloads = {}
    for hits in hit_lists:
        for rank, hit in enumerate(hits, start=1):
            if hit.id not in best_rank or rank < best_rank[hit.id]:
                best_rank[hit.id] = rank
            payloads[hit.id] = hit.payload
    ordered = sorted(best_rank.items(), key=lambda kv: kv[1])

    class _Hit:
        def __init__(self, id_, payload):
            self.id = id_
            self.payload = payload

    return [_Hit(pid, payloads[pid]) for pid, _ in ordered]


def _hits_preview(hits):
    return [{"id": h.id, "score": round(getattr(h, "score", 0.0), 4), "text": h.payload.get("text", "")[:160]} for h in hits]


@app.route("/api/chat/start", methods=["POST"])
def api_chat_start():
    if not vectorstore.collection_exists():
        return jsonify({"error": "No data ingested yet — go to /ingest first"}), 400
    body = request.get_json(force=True)
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400

    job_id = new_job()
    thread = threading.Thread(target=_run_chat, args=(job_id, question), daemon=True)
    STATE["jobs"][job_id]["thread"] = thread
    thread.start()
    return jsonify({"job_id": job_id})


@app.route("/api/chat/stream/<job_id>")
def api_chat_stream(job_id):
    if job_id not in STATE["jobs"]:
        return jsonify({"error": "unknown job"}), 404
    return Response(sse_stream(job_id), mimetype="text/event-stream")


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
@app.route("/api/status")
def api_status():
    return jsonify({
        "collection": vectorstore.collection_info(),
        "llm_provider": config.LLM_PROVIDER,
        "has_upload": STATE["upload_path"] is not None,
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5050"))
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
