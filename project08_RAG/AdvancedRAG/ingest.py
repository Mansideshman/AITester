"""CLI ingestion: bypasses the /upload + /ingest UI for scripted/reproducible
runs, e.g.:

    python ingest.py testcase/vwo_test_cases_5000.csv \
        --text-cols title,steps,expected,tags \
        --meta-cols id,jira_id,priority,module
"""
from __future__ import annotations

import argparse
from pathlib import Path

from rag import chunking, docs, embeddings, vectorstore


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="CSV/XLSX file to ingest")
    parser.add_argument("--text-cols", required=True, help="comma-separated columns to embed")
    parser.add_argument("--meta-cols", default="", help="comma-separated columns to keep as payload")
    args = parser.parse_args()

    text_cols = [c.strip() for c in args.text_cols.split(",") if c.strip()]
    meta_cols = [c.strip() for c in args.meta_cols.split(",") if c.strip()]

    print(f"Reading {args.path}…")
    df = docs.load_table(args.path)
    print(f"  {len(df)} rows, columns: {list(df.columns)}")

    print("Assembling documents…")
    assembled = docs.assemble_docs(df, text_cols, meta_cols)

    print("Chunking…")
    chunk_records = chunking.chunk_docs(assembled)
    print(f"  {len(chunk_records)} chunks")

    print("Embedding with bge-m3 (dense + sparse)… this loads a ~2.3GB model on first run.")
    texts = [c["text"] for c in chunk_records]

    def on_batch(done, total):
        print(f"  embedded {done}/{total}", end="\r")

    vectors = embeddings.embed_texts(texts, on_batch=on_batch)
    print()

    print("Indexing into Qdrant…")
    vectorstore.recreate_collection()
    vectorstore.upsert_chunks(chunk_records, vectors["dense"], vectors["sparse"])
    info = vectorstore.collection_info()
    print(f"Done. Collection '{vectorstore.config.COLLECTION_NAME}': {info}")


if __name__ == "__main__":
    main()
