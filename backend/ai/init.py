from __future__ import annotations

from dataclasses import dataclass

from backend.ai.config import get_ai_config
from backend.ai.config import AIConfig
from backend.ai.rag.index import RAGIndex
from backend.ai.services.ai_service import AIService
from backend.ai.services.dataset_service import DatasetService
from backend.ai.services.memory_service import MemoryService
from backend.ai.services.openrouter_client import OpenRouterClient
from backend.ai.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass(slots=True)
class AIContainer:
    config: AIConfig
    rag_index: RAGIndex
    memory_service: MemoryService
    dataset_service: DatasetService
    ai_service: AIService
    openrouter_client: OpenRouterClient

    async def aclose(self) -> None:
        await self.openrouter_client.aclose()


async def initialize_ai_container() -> AIContainer:
    config = get_ai_config()
    logger.info("Initializing AI container")
    rag_index = RAGIndex(config)
    await rag_index.rebuild()
    memory_service = MemoryService(config)
    await memory_service.initialize()
    dataset_service = DatasetService(config, rag_index)
    openrouter_client = OpenRouterClient(config)
    ai_service = AIService(
        config, rag_index, memory_service, dataset_service, openrouter_client
    )
    return AIContainer(
        config=config,
        rag_index=rag_index,
        memory_service=memory_service,
        dataset_service=dataset_service,
        ai_service=ai_service,
        openrouter_client=openrouter_client,
    )
