from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DatasetInfo(BaseModel):
    hackathon_id: str
    file_name: str
    chunk_count: int
    size_bytes: int
    updated_at: datetime


class DatasetListResponse(BaseModel):
    success: bool = True
    datasets: list[DatasetInfo] = Field(default_factory=list)


class DatasetUploadResponse(BaseModel):
    success: bool = True
    message: str
    dataset: DatasetInfo


class DatasetUploadRequest(BaseModel):
    hackathon_id: str = Field(..., min_length=1, max_length=128)
    file_name: str = Field(..., min_length=1, max_length=256)
    content: str = Field(..., min_length=1)
