from __future__ import annotations

import asyncio
from pathlib import Path

from backend.ai.config import AIConfig
from backend.ai.models.dataset import (
    DatasetInfo,
    DatasetListResponse,
    DatasetUploadResponse,
)
from backend.ai.rag.index import RAGIndex
from backend.core.security import secure_filename


class DatasetService:
    def __init__(self, config: AIConfig, rag_index: RAGIndex) -> None:
        self.config = config
        self.rag_index = rag_index

    async def list_datasets(self) -> DatasetListResponse:
        return DatasetListResponse(
            success=True, datasets=self.rag_index.list_dataset_info()
        )

    async def upload_dataset(
        self, hackathon_id: str, file_name: str, content: str
    ) -> DatasetUploadResponse:
        safe_name = secure_filename(file_name)
        if not safe_name.lower().endswith(".txt"):
            raise ValueError("Only text files are supported")
        if len(content.encode("utf-8")) > self.config.max_upload_size_bytes:
            raise ValueError("Uploaded file exceeds the maximum allowed size")

        target = self.config.datasets_dir / f"{secure_filename(hackathon_id)}.txt"
        await self._write_text(target, content)
        dataset_info = await self.rag_index.add_dataset(
            target, hackathon_id=hackathon_id
        )
        return DatasetUploadResponse(
            success=True,
            message="Dataset uploaded successfully",
            dataset=dataset_info,
        )

    async def _write_text(self, path: Path, text: str) -> None:
        await asyncio.to_thread(path.write_text, text, encoding="utf-8")

    async def get_dataset_info(self, hackathon_id: str) -> DatasetInfo | None:
        for dataset in self.rag_index.list_dataset_info():
            if dataset.hackathon_id == hackathon_id:
                return dataset
        return None
