from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.ai.models.chat import ChatQueryRequest, ChatRequest
from backend.ai.models.dataset import (
    DatasetListResponse,
    DatasetUploadRequest,
    DatasetUploadResponse,
)
from backend.ai.models.memory import (
    ClearMemoryRequest,
    ClearMemoryResponse,
    ConversationHistoryResponse,
)
from backend.ai.models.response import AIHealthResponse, AIResponse
from backend.ai.services.ai_service import AIService
from backend.ai.services.dataset_service import DatasetService
from backend.ai.services.memory_service import MemoryService
from backend.core.dependencies import (
    get_ai_service,
    get_dataset_service,
    get_memory_service,
)

router = APIRouter()


@router.post("/chat", response_model=AIResponse)
async def chat(
    payload: ChatRequest,
    service: AIService = Depends(get_ai_service),
) -> AIResponse:
    return await service.chat(payload)


@router.post("/query", response_model=AIResponse)
async def query(
    payload: ChatQueryRequest,
    service: AIService = Depends(get_ai_service),
) -> AIResponse:
    return await service.query(payload)


@router.get("/history/{session_id}", response_model=ConversationHistoryResponse)
async def history(
    session_id: str,
    memory_service: MemoryService = Depends(get_memory_service),
) -> ConversationHistoryResponse:
    return await memory_service.get_history(session_id)


@router.post("/clear-memory", response_model=ClearMemoryResponse)
async def clear_memory(
    payload: ClearMemoryRequest,
    memory_service: MemoryService = Depends(get_memory_service),
) -> ClearMemoryResponse:
    return await memory_service.clear_memory(payload.session_id, payload.user_id)


@router.get("/health", response_model=AIHealthResponse)
async def health(service: AIService = Depends(get_ai_service)) -> AIHealthResponse:
    return await service.health()


@router.post("/upload-dataset", response_model=DatasetUploadResponse)
async def upload_dataset(
    payload: DatasetUploadRequest,
    dataset_service: DatasetService = Depends(get_dataset_service),
) -> DatasetUploadResponse:
    try:
        return await dataset_service.upload_dataset(
            hackathon_id=payload.hackathon_id,
            file_name=payload.file_name,
            content=payload.content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/datasets", response_model=DatasetListResponse)
async def datasets(
    dataset_service: DatasetService = Depends(get_dataset_service),
) -> DatasetListResponse:
    return await dataset_service.list_datasets()
