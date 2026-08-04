from __future__ import annotations

from pathlib import Path

from .base import Document, walk_files

SOURCE_TYPE = "selenium_code"


def _enclosing_type_name(path: tuple) -> str | None:
    import javalang.tree as tree

    for node in reversed(path):
        if isinstance(node, (tree.ClassDeclaration, tree.InterfaceDeclaration, tree.EnumDeclaration)):
            return node.name
    return None


def _method_chunks(java_source: str, rel_path: str) -> list[Document] | None:
    """One Document per method/constructor, using each declaration's start
    line and the next declaration's start line as an approximate end
    (javalang gives no end-line, only start position). Returns None if the
    file doesn't parse or has no methods, so callers can fall back."""
    import javalang

    try:
        tree = javalang.parse.parse(java_source)
    except Exception:
        return None

    lines = java_source.splitlines()
    units = []  # (start_line, class_name, method_name)
    for node_type in (javalang.tree.MethodDeclaration, javalang.tree.ConstructorDeclaration):
        for path, node in tree.filter(node_type):
            if node.position is None:
                continue
            units.append((node.position.line, _enclosing_type_name(path), node.name))

    if not units:
        return None

    units.sort(key=lambda u: u[0])
    documents: list[Document] = []
    for i, (start_line, class_name, method_name) in enumerate(units):
        end_line = units[i + 1][0] - 1 if i + 1 < len(units) else len(lines)
        body = "\n".join(lines[start_line - 1:end_line]).strip()
        if not body:
            continue
        qualified = f"{class_name}.{method_name}" if class_name else method_name
        documents.append({
            "source_id": f"{rel_path}::{qualified}#{start_line}",
            "title": f"{rel_path} :: {qualified}() L{start_line}-{end_line}",
            "text": body,
            "meta": {
                "repo_name": "selenium_repo", "file_path": rel_path,
                "class_name": class_name, "method_name": method_name,
                "start_line": start_line, "end_line": end_line, "language": "java",
            },
        })
    return documents


def load(folder: Path) -> list[Document]:
    documents: list[Document] = []
    for path in walk_files(folder, {".java", ".xml", ".properties"}):
        rel_path = str(path.relative_to(folder))
        text = path.read_text(encoding="utf-8", errors="replace")
        if not text.strip():
            continue

        if path.suffix == ".java":
            method_docs = _method_chunks(text, rel_path)
            if method_docs:
                documents.extend(method_docs)
                continue
            # Parse failed or no methods (e.g. interface, POJO) — whole file
            # falls through to base.chunk_documents' generic sliding window.

        documents.append({
            "source_id": rel_path,
            "title": rel_path,
            "text": text,
            "meta": {"repo_name": "selenium_repo", "file_path": rel_path, "language": "java" if path.suffix == ".java" else "config"},
        })
    return documents
