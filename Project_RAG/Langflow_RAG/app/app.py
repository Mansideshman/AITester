from __future__ import annotations

import os

from flask import Flask, jsonify, render_template, request

from rag import config, vectorstore, llm

app = Flask(__name__)

LAST_CITED_IDS: list[int] = []


@app.route("/")
def index():
    return render_template("chat.html", active="chat")


@app.route("/chunks")
def chunks_page():
    return render_template("chunks.html", active="chunks")


@app.route("/chat")
def chat_page():
    return render_template("chat.html", active="chat")


@app.route("/api/status")
def api_status():
    try:
        count = vectorstore.collection_count()
    except Exception:
        count = 0
    return jsonify({"points_count": count, "exists": count > 0, "llm_model": config.GROQ_MODEL})


@app.route("/api/chunks")
def api_chunks():
    cursor = request.args.get("cursor", "0")
    points, next_cursor = vectorstore.scroll_chunks(cursor=cursor, limit=50)
    last_used = set(LAST_CITED_IDS)
    out = [
        {"id": p["id"], "text": p["text"], "meta": p["meta"], "used_in_last_answer": p["id"] in last_used}
        for p in points
    ]
    return jsonify({"chunks": out, "next_cursor": next_cursor})


@app.route("/api/chat", methods=["POST"])
def api_chat():
    body = request.get_json(force=True) or {}
    question = (body.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400

    if vectorstore.collection_count() == 0:
        return jsonify({"error": "No data ingested yet."}), 400

    hits = vectorstore.query(question)
    chunks = [{"id": h["id"], "score": h["score"], "text": h["text"], "meta": h["meta"]} for h in hits]

    try:
        answer = llm.generate_answer(question, chunks)
    except llm.GroqNotConfiguredError as exc:
        return jsonify({"error": str(exc)}), 400

    LAST_CITED_IDS[:] = [c["id"] for c in chunks]
    return jsonify({
        "question": question,
        "retrieved_chunks": [
            {"id": c["id"], "score": round(c["score"], 4), "text": c["text"][:220], "meta": c["meta"]}
            for c in chunks
        ],
        "answer": answer,
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5060"))
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
