from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth
from database import get_db
from services.ai_service import ai_service
from schemas.ai_chatbot import AILogResponse, AIChatRequest, AIChatResponse

router = APIRouter()


def get_ai_logs_collection():
    return get_db()["aiLogs"]


def _require_student(current_user: dict) -> str:
    if current_user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The AI Assistant is available to students only.",
        )
    user_id = current_user.get("_id") or current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated student identity is missing.",
        )
    return str(user_id)


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_ai_co_mentor(
    request: AIChatRequest,
    current_user: dict = Depends(with_auth),
):
    user_id = _require_student(current_user)
    query = request.query
    hackathon_id = request.hackathon_id

    resolved_hackathon_id = hackathon_id
    if resolved_hackathon_id:
        hackathons_collection = get_db()["hackathons"]
        hackathon = None
        if ObjectId.is_valid(resolved_hackathon_id):
            hackathon = await hackathons_collection.find_one({"_id": ObjectId(resolved_hackathon_id)})
        if not hackathon:
            hackathon = await hackathons_collection.find_one({"hackathonId": resolved_hackathon_id})
        if not hackathon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon context was not found.")
        resolved_hackathon_id = str(hackathon.get("_id") or resolved_hackathon_id)

    print(
        f"AI chat request received context={'hackathon' if resolved_hackathon_id else 'general'} "
        f"query_chars={len(query)}"
    )

    response_data = await ai_service.generate_response(
        query, [], resolved_hackathon_id, student_id=user_id
    )
    response_text = response_data.get("response")
    if not isinstance(response_text, str) or not response_text.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service returned no answer. Please try again shortly.",
        )

    log_data = {
        "userId": user_id,
        "hackathonId": resolved_hackathon_id or "general",
        "query": query,
        "response": response_text,
        "timestamp": datetime.utcnow(),
    }

    logs_collection = get_ai_logs_collection()
    await logs_collection.insert_one(log_data)

    return {"response": response_text, "timestamp": log_data["timestamp"]}


@router.get("/logs", response_model=List[AILogResponse])
async def get_my_ai_logs(
    hackathon_id: Optional[str] = None, current_user: dict = Depends(with_auth)
):
    user_id = _require_student(current_user)
    logs_collection = get_ai_logs_collection()
    query = {"userId": user_id}
    if hackathon_id:
        query["hackathonId"] = hackathon_id

    cursor = logs_collection.find(query).sort("timestamp", -1)
    logs = await cursor.to_list(100)

    for log in logs:
        log["_id"] = str(log["_id"])

    return [AILogResponse(**log) for log in logs]
