from jira_qa_crew.services.pipeline import parse_ticket_input


def test_splits_on_commas_spaces_newlines_semicolons():
    valid, invalid = parse_ticket_input("VWO-48, VWO-49\nVWO-50; VWO-51 VWO-52")
    assert valid == ["VWO-48", "VWO-49", "VWO-50", "VWO-51", "VWO-52"]
    assert invalid == []


def test_normalizes_to_uppercase():
    valid, _ = parse_ticket_input("vwo-48")
    assert valid == ["VWO-48"]


def test_deduplicates_preserving_order():
    valid, _ = parse_ticket_input("VWO-48, VWO-49, VWO-48")
    assert valid == ["VWO-48", "VWO-49"]


def test_rejects_malformed_tokens():
    valid, invalid = parse_ticket_input("VWO-48, not-a-ticket, 12345, VWO-49")
    assert valid == ["VWO-48", "VWO-49"]
    assert "12345" in invalid


def test_empty_input_yields_nothing():
    valid, invalid = parse_ticket_input("")
    assert valid == []
    assert invalid == []
