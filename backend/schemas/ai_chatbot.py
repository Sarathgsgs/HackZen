from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field, field_validator


class AIChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    hackathon_id: Optional[str] = Field(None, max_length=128)
    history: Optional[List[Dict[str, Any]]] = None
    team_id: Optional[str] = None

    @field_validator("query")
    @classmethod
    def trim_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank.")
        return value

    @field_validator("hackathon_id")
    @classmethod
    def trim_hackathon_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None


class AIChatResponse(BaseModel):
    response: str
    timestamp: datetime


class AILogBase(BaseModel):
    userId: str = Field(..., alias="userId")
    hackathonId: str = Field(..., alias="hackathonId")
    query: str
    response: str


class AILogResponse(AILogBase):
    id: str = Field(..., alias="_id")
    timestamp: datetime

    class Config:
        populate_by_name = True
