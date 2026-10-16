from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class HistoryMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime


class SessionMemory(BaseModel):
    session_id: str
    user_id: str | None = None
    hackathon_id: str | None = None
    messages: list[HistoryMessage] = Field(default_factory=list)
    summary: str = ""
    updated_at: datetime


class ConversationHistoryResponse(BaseModel):
    success: bool = True
    session_id: str
    messages: list[HistoryMessage] = Field(default_factory=list)


class ClearMemoryRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    user_id: str | None = Field(default=None, max_length=128)


class ClearMemoryResponse(BaseModel):
    success: bool = True
    session_id: str
    cleared: bool
