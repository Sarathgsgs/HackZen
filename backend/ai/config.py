from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from backend.core.config import settings


@dataclass(slots=True, frozen=True)
class AIConfig:
    api_key: str
    model: str
    temperature: float
    max_tokens: int
    timeout_seconds: float
    retry_attempts: int
    retry_backoff_seconds: float
    datasets_dir: Path
    memory_file: Path
    logs_dir: Path
    chunk_size: int
    chunk_overlap: int
    top_k: int
    history_limit: int
    max_upload_size_bytes: int


def get_ai_config() -> AIConfig:
    return AIConfig(
        api_key=settings.openrouter_api_key,
        model=settings.openrouter_model,
        temperature=settings.openrouter_temperature,
        max_tokens=settings.openrouter_max_tokens,
        timeout_seconds=settings.openrouter_timeout_seconds,
        retry_attempts=settings.openrouter_retry_attempts,
        retry_backoff_seconds=settings.openrouter_retry_backoff_seconds,
        datasets_dir=settings.datasets_dir,
        memory_file=settings.memory_dir / "memory_store.json",
        logs_dir=settings.logs_dir,
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
        top_k=settings.rag_top_k,
        history_limit=settings.history_limit,
        max_upload_size_bytes=settings.max_upload_size_mb * 1024 * 1024,
    )
