"""Atlassian Document Format (ADF) -> plain text conversion.

Jira Cloud's REST v3 API returns `description` (and comment bodies) as ADF
JSON rather than plain text or markdown. We only need readable text for the
LLM, not round-trippable formatting, so this walks the node tree and joins
text nodes with light markdown-ish structure (headings, bullets, code).
"""

from __future__ import annotations

from typing import Any


def adf_to_text(node: Any) -> str:
    """Convert an ADF document (or fragment) to plain-ish text.

    Accepts a dict (the parsed JSON), a list of nodes, or a plain string
    (some Jira Server/DC instances still return plain text) and always
    returns a string.
    """
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "\n".join(part for part in (adf_to_text(n) for n in node) if part)
    if not isinstance(node, dict):
        return ""

    node_type = node.get("type")
    content = node.get("content", [])

    if node_type == "text":
        text = node.get("text", "")
        marks = {m.get("type") for m in node.get("marks", []) if isinstance(m, dict)}
        if "code" in marks:
            text = f"`{text}`"
        if "strong" in marks:
            text = f"**{text}**"
        return text

    if node_type == "hardBreak":
        return "\n"

    if node_type in {"heading"}:
        level = int(node.get("attrs", {}).get("level", 1))
        return f"\n{'#' * level} {_inline(content)}\n"

    if node_type == "paragraph":
        return f"{_inline(content)}\n"

    if node_type == "bulletList":
        items = [f"- {_inline(item.get('content', []))}" for item in content]
        return "\n".join(items) + "\n"

    if node_type == "orderedList":
        items = [f"{i + 1}. {_inline(item.get('content', []))}" for i, item in enumerate(content)]
        return "\n".join(items) + "\n"

    if node_type == "listItem":
        return _inline(content)

    if node_type == "codeBlock":
        lang = node.get("attrs", {}).get("language", "")
        return f"```{lang}\n{_inline(content)}\n```\n"

    if node_type == "blockquote":
        quoted = _inline(content)
        return "\n".join(f"> {line}" for line in quoted.splitlines()) + "\n"

    if node_type == "rule":
        return "\n---\n"

    if node_type == "table":
        rows = [adf_to_text(row) for row in content]
        return "\n".join(rows) + "\n"

    if node_type in {"tableRow"}:
        cells = [_inline(cell.get("content", [])) for cell in content]
        return " | ".join(cells)

    if node_type in {"tableCell", "tableHeader"}:
        return _inline(content)

    if node_type == "mention":
        return f"@{node.get('attrs', {}).get('text', 'user')}"

    if node_type in {"doc"}:
        return "\n".join(part for part in (adf_to_text(n) for n in content) if part is not None)

    # Unknown node type: fall back to recursing into its content so we
    # never silently drop text the reader would consider part of the ticket.
    return adf_to_text(content)


def _inline(nodes: list) -> str:
    return "".join(adf_to_text(n) for n in nodes).strip()
