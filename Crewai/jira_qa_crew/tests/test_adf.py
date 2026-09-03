from jira_qa_crew.jira.adf import adf_to_text


def test_none_and_plain_string():
    assert adf_to_text(None) == ""
    assert adf_to_text("already plain text") == "already plain text"


def test_paragraph_and_bold_text():
    doc = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Hello "},
                    {"type": "text", "text": "world", "marks": [{"type": "strong"}]},
                ],
            }
        ],
    }
    text = adf_to_text(doc)
    assert "Hello" in text
    assert "**world**" in text


def test_bullet_list():
    doc = {
        "type": "bulletList",
        "content": [
            {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "item one"}]}]},
            {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "item two"}]}]},
        ],
    }
    text = adf_to_text(doc)
    assert "- item one" in text
    assert "- item two" in text


def test_heading_level():
    doc = {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Section"}]}
    assert "## Section" in adf_to_text(doc)


def test_unknown_node_falls_back_to_content():
    doc = {"type": "someFutureNode", "content": [{"type": "text", "text": "still readable"}]}
    assert "still readable" in adf_to_text(doc)
