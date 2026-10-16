from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import Iterable, List

_SPACE_RE = re.compile(r"\s+")


def normalize_text(value: str) -> str:
    return _SPACE_RE.sub(" ", value).strip()


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    normalized = normalize_text(text)
    if not normalized:
        return []
    if chunk_size <= 0:
        return [normalized]
    chunks: List[str] = []
    start = 0
    length = len(normalized)
    while start < length:
        end = min(start + chunk_size, length)
        chunks.append(normalized[start:end].strip())
        if end >= length:
            break
        start = max(0, end - chunk_overlap)
    return [chunk for chunk in chunks if chunk]


def summarize_lines(lines: Iterable[str], limit: int = 3) -> str:
    collected = [normalize_text(line) for line in lines if normalize_text(line)]
    return " ".join(collected[:limit])


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
