from __future__ import annotations

from logging.handlers import RotatingFileHandler
import logging

from backend.core.config import settings


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )
    root.setLevel(level.upper())
    has_stream_handler = any(
        isinstance(handler, logging.StreamHandler)
        and not isinstance(handler, logging.FileHandler)
        for handler in root.handlers
    )
    has_file_handler = any(
        isinstance(handler, RotatingFileHandler)
        and getattr(handler, "baseFilename", "").endswith("hackathon_portal.log")
        for handler in root.handlers
    )

    if not has_stream_handler:
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        root.addHandler(stream_handler)

    if not has_file_handler:
        file_handler = RotatingFileHandler(
            settings.logs_dir / "hackathon_portal.log",
            maxBytes=5_000_000,
            backupCount=3,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
