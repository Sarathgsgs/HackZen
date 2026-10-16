from __future__ import annotations

from backend.ai.config import AIConfig
from backend.ai.memory.store import MemoryStore
from backend.ai.models.memory import (
    ClearMemoryResponse,
    ConversationHistoryResponse,
    SessionMemory,
)


class MemoryService:
    def __init__(self, config: AIConfig) -> None:
        self.config = config
        self.store = MemoryStore(config.memory_file)

    async def initialize(self) -> None:
        await self.store.initialize()

    async def get_history(self, session_id: str) -> ConversationHistoryResponse:
        messages = await self.store.get_history(session_id)
        return ConversationHistoryResponse(
            success=True, session_id=session_id, messages=messages
        )

    async def get_session(self, session_id: str) -> SessionMemory | None:
        return await self.store.get_session(session_id)

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        user_id: str | None = None,
        hackathon_id: str | None = None,
    ) -> SessionMemory:
        return await self.store.save_message(
            session_id=session_id,
            role=role,
            content=content,
            user_id=user_id,
            hackathon_id=hackathon_id,
        )

    async def update_memory(
        self,
        session_id: str,
        summary: str | None = None,
        user_id: str | None = None,
        hackathon_id: str | None = None,
    ) -> SessionMemory | None:
        return await self.store.update_memory(
            session_id=session_id,
            summary=summary,
            user_id=user_id,
            hackathon_id=hackathon_id,
        )

    async def clear_memory(
        self, session_id: str, user_id: str | None = None
    ) -> ClearMemoryResponse:
        cleared = False
        if session_id:
            cleared = await self.store.clear_session(session_id)
        if user_id:
            user_cleared = await self.store.clear_user(user_id)
            cleared = cleared or user_cleared > 0
        return ClearMemoryResponse(success=True, session_id=session_id, cleared=cleared)

    async def count_sessions(self) -> int:
        return await self.store.count_sessions()
