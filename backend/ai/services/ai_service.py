from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from backend.ai.config import AIConfig
from backend.ai.memory.store import MemoryStore
from backend.ai.models.chat import ChatQueryRequest, ChatRequest
from backend.ai.models.response import AIHealthResponse, AIResponse, SourceItem
from backend.ai.prompts.system import build_system_prompt
from backend.ai.rag.index import RAGIndex
from backend.ai.rag.retriever import ContextRetriever
from backend.ai.services.dataset_service import DatasetService
from backend.ai.services.memory_service import MemoryService
from backend.ai.services.openrouter_client import OpenRouterClient, OpenRouterError
from backend.ai.utils.logging import get_logger
from backend.ai.utils.text import normalize_text


class AIService:
    def __init__(
        self,
        config: AIConfig,
        rag_index: RAGIndex,
        memory_service: MemoryService,
        dataset_service: DatasetService,
        openrouter_client: OpenRouterClient,
    ) -> None:
        self.config = config
        self.rag_index = rag_index
        self.memory_service = memory_service
        self.dataset_service = dataset_service
        self.openrouter_client = openrouter_client
        self.retriever = ContextRetriever(rag_index)
        self.logger = get_logger(self.__class__.__name__)

    async def chat(self, request: ChatRequest | ChatQueryRequest) -> AIResponse:
        session = await self.memory_service.get_session(request.session_id)
        history_response = await self.memory_service.get_history(request.session_id)
        history_messages = history_response.messages
        retrieval = await self.retriever.retrieve(
            query=request.message,
            hackathon_id=request.hackathon_id,
            top_k=self.config.top_k,
        )
        memory_summary = session.summary if session else ""
        system_prompt = build_system_prompt(
            hackathon_id=request.hackathon_id,
            retrieved_context=retrieval.context,
            memory_summary=memory_summary,
            dataset_sources=[source.file_name for source in retrieval.sources],
        )

        prompt_messages = self._compose_messages(
            system_prompt=system_prompt,
            history=history_messages,
            user_message=request.message,
        )

        response_text = await self._generate_socratic_response(
            request=request,
            retrieval_context=retrieval.context,
            sources=retrieval.sources,
            prompt_messages=prompt_messages,
        )

        await self.memory_service.save_message(
            session_id=request.session_id,
            role="user",
            content=request.message,
            user_id=request.user_id,
            hackathon_id=request.hackathon_id,
        )
        await self.memory_service.save_message(
            session_id=request.session_id,
            role="assistant",
            content=response_text,
            user_id=request.user_id,
            hackathon_id=request.hackathon_id,
        )

        return AIResponse(
            success=True,
            response=response_text,
            sources=retrieval.sources,
            memory_used=True,
            session_id=request.session_id,
            timestamp=datetime.now(timezone.utc),
        )

    async def query(self, request: ChatQueryRequest) -> AIResponse:
        return await self.chat(request)

    async def health(self) -> AIHealthResponse:
        return AIHealthResponse(
            success=True,
            status="healthy",
            openrouter_ready=self.openrouter_client.ready,
            datasets_loaded=len(self.rag_index.list_dataset_info()),
            sessions_loaded=await self.memory_service.count_sessions(),
            timestamp=datetime.now(timezone.utc),
        )

    def _compose_messages(
        self,
        system_prompt: str,
        history: list,
        user_message: str,
    ) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        for message in history[-self.config.history_limit :]:
            messages.append(
                {
                    "role": message.role,
                    "content": normalize_text(message.content),
                }
            )
        messages.append({"role": "user", "content": normalize_text(user_message)})
        return messages

    async def _generate_socratic_response(
        self,
        request: ChatRequest | ChatQueryRequest,
        retrieval_context: str,
        sources: list[SourceItem],
        prompt_messages: list[dict[str, str]],
    ) -> str:
        try:
            if self.openrouter_client.ready:
                return await self.openrouter_client.chat(prompt_messages)
        except OpenRouterError as exc:
            self.logger.warning("OpenRouter fallback activated: %s", exc)
        return self._fallback_socratic_response(
            request.message, retrieval_context, sources
        )

    def _fallback_socratic_response(
        self,
        user_message: str,
        retrieval_context: str,
        sources: Iterable[SourceItem],
    ) -> str:
        source_list = list(sources)
        question_lead = self._guiding_questions(user_message)
        context_hint = (
            f"Relevant hackathon context:\n{retrieval_context}\n"
            if retrieval_context
            else "I did not find a matching dataset snippet, so let us reason from the goal itself.\n"
        )
        source_hint = ""
        if source_list:
            source_hint = "\n".join(
                f"- {source.hackathon_id}/{source.file_name} chunk {source.chunk_id}: {source.excerpt[:180]}"
                for source in source_list[:3]
            )
            source_hint = f"Useful references:\n{source_hint}\n"
        step_path = (
            "1. Clarify the problem statement.\n"
            "2. Identify constraints and success criteria.\n"
            "3. Compare possible approaches.\n"
            "4. Choose the smallest viable next step.\n"
        )
        return (
            f"{question_lead}\n\n"
            f"{context_hint}\n"
            f"{source_hint}"
            f"Suggested path forward:\n{step_path}"
            "What part of the problem feels most uncertain right now?"
        ).strip()

    def _guiding_questions(self, user_message: str) -> str:
        message = user_message.lower()
        if "architecture" in message or "backend" in message:
            return (
                "What responsibilities should be separated in a scalable backend architecture? "
                "How would you organize API routes, business logic, and persistence so the system stays maintainable?"
            )
        if "feature" in message or "build" in message:
            return (
                "What is the smallest feature that would prove the idea works? "
                "Which user problem should be solved first, and how will you measure success?"
            )
        return (
            "What outcome are you trying to achieve, and what constraint matters most? "
            "If you had to solve only the next step, what would it be?"
        )
