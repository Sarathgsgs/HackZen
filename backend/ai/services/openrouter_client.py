from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from backend.ai.config import AIConfig


class OpenRouterError(RuntimeError):
    pass


class OpenRouterClient:
    base_url = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(self, config: AIConfig) -> None:
        self.config = config
        headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "Hackathon Portal AI Backend",
        }
        if config.api_key:
            headers["Authorization"] = f"Bearer {config.api_key}"
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(config.timeout_seconds),
            headers=headers,
        )
        self._logger = logging.getLogger(self.__class__.__name__)

    @property
    def ready(self) -> bool:
        return bool(self.config.api_key)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def chat(self, messages: list[dict[str, str]]) -> str:
        if not self.ready:
            raise OpenRouterError("OpenRouter API key is not configured")

        payload = {
            "model": self.config.model,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "messages": messages,
        }

        last_error: Exception | None = None
        for attempt in range(1, self.config.retry_attempts + 1):
            try:
                response = await self._client.post(self.base_url, json=payload)
                response.raise_for_status()
                data: dict[str, Any] = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise OpenRouterError("OpenRouter returned no choices")
                message = choices[0].get("message", {})
                content = message.get("content", "")
                if not isinstance(content, str) or not content.strip():
                    raise OpenRouterError("OpenRouter returned an empty response")
                return content.strip()
            except (httpx.TimeoutException, httpx.HTTPError, OpenRouterError) as exc:
                last_error = exc
                self._logger.warning("OpenRouter attempt %s failed: %s", attempt, exc)
                if attempt < self.config.retry_attempts:
                    await asyncio.sleep(self.config.retry_backoff_seconds * attempt)
        raise OpenRouterError(f"OpenRouter request failed after retries: {last_error}")
