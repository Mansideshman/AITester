from __future__ import annotations

import re
from pathlib import Path

from .base import Document, walk_files

# Matches the start of a function/class/test-block declaration and captures
# a best-effort symbol name. No real TypeScript AST parser is used here
# (none lightweight/pure-Python exists) — this is an approximate heuristic,
# not a real parser, and falls back to the generic chunker where it finds
# nothing.
_BLOCK_START_RE = re.compile(
    r"^\s*(?:export\s+)?(?:default\s+)?"
    r"(?:async\s+function\s+(?P<fn>\w+)"
    r"|class\s+(?P<cls>\w+)"
    r"|(?:test|it|describe)\s*\(\s*['\"](?P<test>[^'\"]+)['\"]"
    r"|const\s+(?P<const>\w+)\s*=\s*(?:async\s*)?\("
    r")",
    re.MULTILINE,
)


def _find_block_end(lines: list[str], start_idx: int) -> int:
    """Tracks brace depth from the first '{' at/after start_idx to find the
    matching close. Returns the 0-indexed line of the closing brace, or the
    last line if braces never balance (malformed/truncated snippet)."""
    depth = 0
    seen_open = False
    for i in range(start_idx, len(lines)):
        for ch in lines[i]:
            if ch == "{":
                depth += 1
                seen_open = True
            elif ch == "}":
                depth -= 1
        if seen_open and depth <= 0:
            return i
    return len(lines) - 1


def _block_chunks(source: str, rel_path: str) -> list[Document] | None:
    lines = source.splitlines()
    matches = list(_BLOCK_START_RE.finditer(source))
    if not matches:
        return None

    documents: list[Document] = []
    for match in matches:
        start_line = source.count("\n", 0, match.start())
        symbol = match.group("fn") or match.group("cls") or match.group("test") or match.group("const")
        end_line = _find_block_end(lines, start_line)
        body = "\n".join(lines[start_line:end_line + 1]).strip()
        if not body:
            continue
        documents.append({
            "source_id": f"{rel_path}::{symbol}#{start_line + 1}",
            "title": f"{rel_path} :: {symbol}() L{start_line + 1}-{end_line + 1}",
            "text": body,
            "meta": {
                "repo_name": "playwright_repo", "file_path": rel_path,
                "symbol_name": symbol, "start_line": start_line + 1,
                "end_line": end_line + 1, "language": "typescript",
            },
        })
    return documents or None


def load(folder: Path) -> list[Document]:
    documents: list[Document] = []
    for path in walk_files(folder, {".ts", ".tsx", ".json"}):
        rel_path = str(path.relative_to(folder))
        text = path.read_text(encoding="utf-8", errors="replace")
        if not text.strip():
            continue

        if path.suffix in (".ts", ".tsx"):
            block_docs = _block_chunks(text, rel_path)
            if block_docs:
                documents.extend(block_docs)
                continue

        documents.append({
            "source_id": rel_path,
            "title": rel_path,
            "text": text,
            "meta": {"repo_name": "playwright_repo", "file_path": rel_path, "language": "typescript" if path.suffix != ".json" else "config"},
        })
    return documents
