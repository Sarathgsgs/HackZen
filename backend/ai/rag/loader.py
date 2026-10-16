from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from backend.ai.utils.text import chunk_text


@dataclass(slots=True)
class LoadedDataset:
    hackathon_id: str
    file_name: str
    path: Path
    text: str
    size_bytes: int


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_dataset(path: Path, hackathon_id: str | None = None) -> LoadedDataset:
    resolved_hackathon_id = hackathon_id or path.stem
    text = load_text(path)
    return LoadedDataset(
        hackathon_id=resolved_hackathon_id,
        file_name=path.name,
        path=path,
        text=text,
        size_bytes=path.stat().st_size,
    )


def iter_txt_files(directory: Path) -> Iterable[Path]:
    if not directory.exists():
        return []
    return sorted(path for path in directory.glob("*.txt") if path.is_file())


def build_chunks(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    return chunk_text(text, chunk_size, chunk_overlap)
