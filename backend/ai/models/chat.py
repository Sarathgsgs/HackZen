from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from backend.core.security import sanitize_text


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    hackathon_id: str = Field(..., min_length=1, max_length=128)
    message: str = Field(..., min_length=1, max_length=8000)
    user_id: str | None = Field(default=None, max_length=128)

    @field_validator("session_id", "hackathon_id", "message", "user_id", mode="before")
    @classmethod
    def sanitize_values(cls, value):
        if value is None:
            return value
        return sanitize_text(str(value))


class ChatQueryRequest(ChatRequest):
    pass
