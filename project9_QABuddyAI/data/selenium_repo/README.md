# selenium_repo

Clone or copy the Selenium framework repo here, e.g.:

```bash
git clone https://github.com/PramodDutta/ATB13xSeleniumAdvanceFramework.git .
```

Ingested by `qabuddy/loaders/selenium_loader.py` (`source_type=selenium_code`).
Java `.java` files are parsed with `javalang` for one chunk per method
(falls back to per-class, then a generic sliding-window split, if parsing
fails). Chunk size/overlap: 800/100 chars.

Run `python ingest.py selenium_code` after adding files.
