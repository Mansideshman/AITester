from typing import Dict, List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    source_types: Optional[List[str]] = None
    top_k: Optional[int] = None


class ChatCitation(BaseModel):
    source_type: str
    label: str
    score: float
    source_id: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[ChatCitation]


class SourceStatus(BaseModel):
    source_type: str
    folder: str
    chunk_count: int = 0
    last_ingested_at: Optional[str] = None
    status: str


class HealthResponse(BaseModel):
    status: str
    vector_backend: str
    collection: Dict
    llm_provider: str


class UploadResponse(BaseModel):
    source_type: str
    saved_files: List[str]
