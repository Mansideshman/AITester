# prd_docs

Drop PRD/SRS/BRD/FRD documents here, as `.pdf`, `.md`, `.txt`, or `.docx`.

Ingested by `qabuddy/loaders/prd_loader.py` (`source_type=prd_doc`) — same
pipeline as `company_docs/` but tagged separately so requirements docs are
filterable/citable on their own (useful for "find the missing test case"
and RTM-style questions). Chunk size/overlap: 1000/150 chars.

Run `python ingest.py prd_doc` after adding files.
