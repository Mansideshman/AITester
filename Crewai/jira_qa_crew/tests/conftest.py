import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import pytest

from jira_qa_crew.config import Settings


@pytest.fixture
def base_settings() -> Settings:
    return Settings(
        llm_model="openai/gpt-oss-120b",
        llm_api_key="test-key",
        demo_mode=True,
    )
