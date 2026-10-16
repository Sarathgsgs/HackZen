# Hackathon Portal Backend

Production-ready FastAPI backend for an AI-powered hackathon portal.

## Features

- OpenRouter-powered AI chat with Socratic guidance
- Hackathon-specific retrieval over text datasets
- Session memory with multi-session support
- Dataset upload and listing
- Rate limiting, validation, sanitization, and structured logging
- JSON-based dataset upload for easy frontend integration

## Quick Start

1. Create a virtual environment.
2. Install dependencies with `pip install -r backend/requirements.txt`.
3. Copy `backend/.env.example` to `.env` and set `OPENROUTER_API_KEY`.
4. Run the API with `uvicorn backend.main:app --reload`.

## API

- `POST /api/ai/chat`
- `POST /api/ai/query`
- `GET /api/ai/history/{session_id}`
- `POST /api/ai/clear-memory`
- `GET /api/ai/health`
- `POST /api/ai/upload-dataset`
- `GET /api/ai/datasets`
