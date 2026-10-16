from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import asyncio
import json
from pathlib import Path
from typing import Any

from backend.ai.models.memory import HistoryMessage, SessionMemory


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class MemorySnapshot:
    sessions: dict[str, SessionMemory]


class MemoryStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = asyncio.Lock()
        self._sessions: dict[str, SessionMemory] = {}
        self._loaded = False

    async def initialize(self) -> None:
        async with self._lock:
            if self._loaded:
                return
            if self.path.exists():
                raw = await asyncio.to_thread(self.path.read_text, encoding="utf-8")
                if raw.strip():
                    payload = json.loads(raw)
                    for session_id, item in payload.get("sessions", {}).items():
                        messages = [
                            HistoryMessage(
                                role=message["role"],
                                content=message["content"],
                                timestamp=datetime.fromisoformat(message["timestamp"]),
                            )
                            for message in item.get("messages", [])
                        ]
                        self._sessions[session_id] = SessionMemory(
                            session_id=session_id,
                            user_id=item.get("user_id"),
                            hackathon_id=item.get("hackathon_id"),
                            messages=messages,
                            summary=item.get("summary", ""),
                            updated_at=datetime.fromisoformat(item["updated_at"]),
                        )
            self._loaded = True
            await self._persist()

    async def _persist(self) -> None:
        payload = {
            "sessions": {
                session_id: {
                    "session_id": session.session_id,
                    "user_id": session.user_id,
                    "hackathon_id": session.hackathon_id,
                    "summary": session.summary,
                    "updated_at": session.updated_at.isoformat(),
                    "messages": [
                        {
                            "role": message.role,
                            "content": message.content,
                            "timestamp": message.timestamp.isoformat(),
                        }
                        for message in session.messages
                    ],
                }
                for session_id, session in self._sessions.items()
            }
        }
        serialized = json.dumps(payload, indent=2, ensure_ascii=False)
        await asyncio.to_thread(self.path.write_text, serialized, encoding="utf-8")

    async def get_session(self, session_id: str) -> SessionMemory | None:
        async with self._lock:
            return self._sessions.get(session_id)

    async def get_history(self, session_id: str) -> list[HistoryMessage]:
        session = await self.get_session(session_id)
        return list(session.messages) if session else []

    async def list_sessions(self) -> list[SessionMemory]:
        async with self._lock:
            return sorted(
                self._sessions.values(),
                key=lambda session: session.updated_at,
                reverse=True,
            )

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        user_id: str | None = None,
        hackathon_id: str | None = None,
    ) -> SessionMemory:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                session = SessionMemory(
                    session_id=session_id,
                    user_id=user_id,
                    hackathon_id=hackathon_id,
                    messages=[],
                    summary="",
                    updated_at=_utcnow(),
                )
                self._sessions[session_id] = session
            if user_id:
                session.user_id = user_id
            if hackathon_id:
                session.hackathon_id = hackathon_id
            session.messages.append(
                HistoryMessage(role=role, content=content, timestamp=_utcnow())
            )
            session.updated_at = _utcnow()
            session.summary = self._summarize(session.messages)
            await self._persist()
            return session

    async def update_memory(
        self,
        session_id: str,
        summary: str | None = None,
        user_id: str | None = None,
        hackathon_id: str | None = None,
    ) -> SessionMemory | None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if summary is not None:
                session.summary = summary
            if user_id is not None:
                session.user_id = user_id
            if hackathon_id is not None:
                session.hackathon_id = hackathon_id
            session.updated_at = _utcnow()
            await self._persist()
            return session

    async def clear_session(self, session_id: str) -> bool:
        async with self._lock:
            existed = session_id in self._sessions
            self._sessions.pop(session_id, None)
            await self._persist()
            return existed

    async def clear_user(self, user_id: str) -> int:
        async with self._lock:
            to_delete = [
                session_id
                for session_id, session in self._sessions.items()
                if session.user_id == user_id
            ]
            for session_id in to_delete:
                self._sessions.pop(session_id, None)
            await self._persist()
            return len(to_delete)

    async def count_sessions(self) -> int:
        async with self._lock:
            return len(self._sessions)

    def _summarize(self, messages: list[HistoryMessage]) -> str:
        recent = messages[-6:]
        summary_parts: list[str] = []
        for message in recent:
            snippet = message.content[:120].strip()
            summary_parts.append(f"{message.role}: {snippet}")
        return " | ".join(summary_parts)
