from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from math import log, sqrt
from pathlib import Path
from typing import Iterable
import asyncio
import re

from backend.ai.config import AIConfig
from backend.ai.models.dataset import DatasetInfo
from backend.ai.models.response import SourceItem
from backend.ai.rag.loader import (
    LoadedDataset,
    build_chunks,
    iter_txt_files,
    load_dataset,
)
from backend.ai.utils.text import normalize_text
from backend.core.security import secure_filename

TOKEN_RE = re.compile(r"[A-Za-z0-9_]+")


def tokenize(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text)]


@dataclass(slots=True)
class IndexedChunk:
    hackathon_id: str
    file_name: str
    chunk_id: int
    text: str
    vector: dict[str, float]
    norm: float
    updated_at: datetime


class RAGIndex:
    def __init__(self, config: AIConfig) -> None:
        self.config = config
        self._lock = asyncio.Lock()
        self._chunks: list[IndexedChunk] = []
        self._datasets: dict[str, DatasetInfo] = {}
        self._documents: dict[str, LoadedDataset] = {}
        self._idf: dict[str, float] = {}

    @property
    def datasets(self) -> list[DatasetInfo]:
        return sorted(self._datasets.values(), key=lambda item: item.hackathon_id)

    def _build_vector(self, text: str, idf: dict[str, float]) -> dict[str, float]:
        tokens = tokenize(text)
        if not tokens:
            return {}
        counts = Counter(tokens)
        max_count = max(counts.values())
        total = sum(counts.values()) or 1
        vector: dict[str, float] = {}
        for token, count in counts.items():
            tf = 0.5 + 0.5 * (count / max_count)
            vector[token] = (count / total) * tf * idf.get(token, 0.0)
        return vector

    def _vector_norm(self, vector: dict[str, float]) -> float:
        return sqrt(sum(weight * weight for weight in vector.values()))

    def _compute_idf(self, chunks: Iterable[str]) -> dict[str, float]:
        doc_count = 0
        document_frequency: dict[str, int] = defaultdict(int)
        for chunk in chunks:
            doc_count += 1
            for token in set(tokenize(chunk)):
                document_frequency[token] += 1
        if doc_count == 0:
            return {}
        return {
            token: log((1 + doc_count) / (1 + frequency)) + 1.0
            for token, frequency in document_frequency.items()
        }

    async def rebuild(self) -> None:
        async with self._lock:
            paths = list(iter_txt_files(self.config.datasets_dir))
            documents = [load_dataset(path) for path in paths]
            self._rebuild_from_documents(documents)

    def _rebuild_from_documents(self, documents: Iterable[LoadedDataset]) -> None:
        self._documents = {doc.hackathon_id: doc for doc in documents}
        chunk_texts: list[str] = []
        chunk_records: list[tuple[LoadedDataset, int, str]] = []
        for document in documents:
            chunks = build_chunks(
                document.text, self.config.chunk_size, self.config.chunk_overlap
            )
            for index, chunk in enumerate(chunks):
                normalized_chunk = normalize_text(chunk)
                chunk_texts.append(normalized_chunk)
                chunk_records.append((document, index, normalized_chunk))

        self._idf = self._compute_idf(chunk_texts)
        self._chunks = []
        self._datasets = {}

        for document in documents:
            chunks = build_chunks(
                document.text, self.config.chunk_size, self.config.chunk_overlap
            )
            updated_at = datetime.fromtimestamp(
                document.path.stat().st_mtime, tz=timezone.utc
            )
            dataset_info = DatasetInfo(
                hackathon_id=document.hackathon_id,
                file_name=document.file_name,
                chunk_count=len(chunks),
                size_bytes=document.size_bytes,
                updated_at=updated_at,
            )
            self._datasets[document.hackathon_id] = dataset_info

        for document, chunk_id, chunk in chunk_records:
            vector = self._build_vector(chunk, self._idf)
            self._chunks.append(
                IndexedChunk(
                    hackathon_id=document.hackathon_id,
                    file_name=document.file_name,
                    chunk_id=chunk_id,
                    text=chunk,
                    vector=vector,
                    norm=self._vector_norm(vector),
                    updated_at=datetime.fromtimestamp(
                        document.path.stat().st_mtime, tz=timezone.utc
                    ),
                )
            )

    async def add_dataset(
        self, path: Path, hackathon_id: str | None = None
    ) -> DatasetInfo:
        async with self._lock:
            secure_name = secure_filename(path.name)
            target_path = self.config.datasets_dir / secure_name
            if target_path != path:
                target_path.write_text(
                    path.read_text(encoding="utf-8"), encoding="utf-8"
                )
            document = load_dataset(target_path, hackathon_id=hackathon_id)
            existing_documents = list(self._documents.values())
            documents = [
                doc
                for doc in existing_documents
                if doc.hackathon_id != document.hackathon_id
            ]
            documents.append(document)
            self._rebuild_from_documents(documents)
            return self._datasets[document.hackathon_id]

    def list_dataset_info(self) -> list[DatasetInfo]:
        return self.datasets

    def list_hackathon_ids(self) -> list[str]:
        return sorted(self._datasets.keys())

    def _score(self, query_vector: dict[str, float], chunk: IndexedChunk) -> float:
        if not query_vector or not chunk.vector or chunk.norm == 0:
            return 0.0
        numerator = 0.0
        for token, query_weight in query_vector.items():
            numerator += query_weight * chunk.vector.get(token, 0.0)
        denominator = self._vector_norm(query_vector) * chunk.norm
        return numerator / denominator if denominator else 0.0

    def search(
        self, query: str, hackathon_id: str | None = None, top_k: int | None = None
    ) -> list[SourceItem]:
        normalized = normalize_text(query)
        if not normalized:
            return []
        query_vector = self._build_vector(normalized, self._idf)
        top_n = top_k or self.config.top_k
        matches = [
            (self._score(query_vector, chunk), chunk)
            for chunk in self._chunks
            if hackathon_id is None or chunk.hackathon_id == hackathon_id
        ]
        matches = [item for item in matches if item[0] > 0]
        matches.sort(key=lambda item: item[0], reverse=True)
        sources: list[SourceItem] = []
        for score, chunk in matches[:top_n]:
            excerpt = chunk.text[:280].strip()
            sources.append(
                SourceItem(
                    hackathon_id=chunk.hackathon_id,
                    file_name=chunk.file_name,
                    chunk_id=chunk.chunk_id,
                    score=round(score, 4),
                    excerpt=excerpt,
                )
            )
        return sources

    def build_context(self, sources: list[SourceItem]) -> str:
        if not sources:
            return ""
        context_lines = []
        for source in sources:
            context_lines.append(
                f"[{source.hackathon_id} | {source.file_name} | chunk {source.chunk_id} | score {source.score}] {source.excerpt}"
            )
        return "\n".join(context_lines)
