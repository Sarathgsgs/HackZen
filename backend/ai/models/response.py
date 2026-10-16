from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SourceItem(BaseModel):
    hackathon_id: str
    file_name: str
    chunk_id: int
    score: float
    excerpt: str


class AIResponse(BaseModel):
    success: bool = True
    response: str
    sources: list[SourceItem] = Field(default_factory=list)
    memory_used: bool
    session_id: str
    timestamp: datetime


class AIHealthResponse(BaseModel):
    success: bool = True
    status: str
    openrouter_ready: bool
    datasets_loaded: int
    sessions_loaded: int
    timestamp: datetime
