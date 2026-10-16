from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
import asyncio
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int, window_seconds: int) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Response]
    ) -> Response:
        client = request.client.host if request.client else "unknown"
        key = f"{client}:{request.url.path}"
        now = datetime.now(timezone.utc).timestamp()
        async with self._lock:
            timestamps = self._requests[key]
            while timestamps and now - timestamps[0] > self.window_seconds:
                timestamps.popleft()
            if len(timestamps) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": "Rate limit exceeded",
                        "detail": f"Try again in {self.window_seconds} seconds.",
                    },
                    headers={"Retry-After": str(self.window_seconds)},
                )
            timestamps.append(now)
        return await call_next(request)
