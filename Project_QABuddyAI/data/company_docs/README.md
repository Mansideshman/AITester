# company_docs

Drop general company documents here: `.pdf`, `.md`, `.txt`, `.docx`.

Ingested by `qabuddy/loaders/company_doc_loader.py` (`source_type=company_doc`),
via the shared `qabuddy/pdf_loader.py` (ported from BasicRAG's document
loader). PDFs chunk per page, other formats per file, with a
sentence-boundary-aware splitter. Chunk size/overlap: 1000/150 chars.

Run `python ingest.py company_doc` after adding files.
