# test_cases

Drop test-case `.csv`/`.xlsx`/`.xls` files here — one row per test case.
Expected columns (case-insensitive, others are ignored):
`id, jira_id, title, module, priority, test_type, tags, preconditions, steps, expected, status, created_date`.

Seeded with a 5,000-row sample (`vwo_test_cases_5000.csv`, copied from
`project08_RAG/AdvancedRAG/testcase/`) so the pipeline can be smoke-tested
end-to-end before real company data is added.

Ingested by `qabuddy/loaders/test_case_loader.py` (`source_type=test_case`),
one row = one document/chunk (falls back to the generic splitter only if a
single row's text exceeds 1000 chars). Chunk size/overlap: 1000/150 chars.

Run `python ingest.py test_case` after adding files.
