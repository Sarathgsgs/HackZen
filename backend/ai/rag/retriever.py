from __future__ import annotations

from dataclasses import dataclass

from backend.ai.models.response import SourceItem
from backend.ai.rag.index import RAGIndex


@dataclass(slots=True)
class RetrievalResult:
    context: str
    sources: list[SourceItem]


class ContextRetriever:
    def __init__(self, index: RAGIndex) -> None:
        self.index = index

    async def retrieve(
        self,
        query: str,
        hackathon_id: str | None = None,
        top_k: int | None = None,
    ) -> RetrievalResult:
        sources = self.index.search(query=query, hackathon_id=hackathon_id, top_k=top_k)
        return RetrievalResult(
            context=self.index.build_context(sources), sources=sources
        )
