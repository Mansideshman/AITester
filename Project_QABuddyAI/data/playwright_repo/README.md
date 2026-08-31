# playwright_repo

Clone or copy the Playwright framework repo here, e.g.:

```bash
git clone https://github.com/PramodDutta/Advance-Playwright-Framework.git .
```

Ingested by `qabuddy/loaders/playwright_loader.py` (`source_type=playwright_code`).
TypeScript `.ts`/`.tsx` files are chunked per function/class/`test()`/
`describe()` block via a regex + brace-depth heuristic (falls back to a
generic sliding-window split where the heuristic finds nothing). Chunk
size/overlap: 800/100 chars.

Run `python ingest.py playwright_code` after adding files.
