# API Reference

## `POST /api/ai/chat`

Guided chat endpoint for conversational mentoring.

Request:

```json
{
  "session_id": "123",
  "hackathon_id": "hackathon_1",
  "message": "Explain the problem statement"
}
```

## `POST /api/ai/query`

Same contract as `/api/ai/chat`, useful for non-chat query flows.

## `GET /api/ai/history/{session_id}`

Returns the stored conversation history for a session.

## `POST /api/ai/clear-memory`

Clears stored memory for a session or user.

## `GET /api/ai/health`

Returns service health, dataset counts, and memory statistics.

## `POST /api/ai/upload-dataset`

JSON body:

```json
{
  "hackathon_id": "hackathon_1",
  "file_name": "hackathon_1.txt",
  "content": "dataset text..."
}
```

## `GET /api/ai/datasets`

Lists loaded dataset metadata.
