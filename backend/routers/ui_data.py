"""Persistent storage for UI datasets that have not yet received a domain API."""
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.dependencies import with_auth
from database import get_db

router = APIRouter()


class UIDataPayload(BaseModel):
    data: Any = Field(...)


@router.get("/{key}")
async def get_ui_data(key: str, current_user: dict = Depends(with_auth)):
    if len(key) > 100 or not key.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid dataset key")
    if key.startswith("admin-") or key == "organizer-approvals":
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        scope = "admin"
    elif key.startswith("organizer-"):
        if current_user.get("role") != "organizer":
            raise HTTPException(status_code=403, detail="Organizer access required")
        scope = str(current_user["_id"])
    elif key.startswith("mentor-"):
        if current_user.get("role") != "mentor":
            raise HTTPException(status_code=403, detail="Mentor access required")
        scope = str(current_user["_id"])
    elif key.startswith("student-"):
        if current_user.get("role") != "student":
            raise HTTPException(status_code=403, detail="Student access required")
        scope = str(current_user["_id"])
    else:
        scope = str(current_user["_id"])
    record = await get_db().ui_data.find_one({"userId": scope, "key": key}, {"_id": 0})
    return {"data": record["data"] if record else None}


@router.put("/{key}")
async def put_ui_data(key: str, payload: UIDataPayload, current_user: dict = Depends(with_auth)):
    if len(key) > 100 or not key.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid dataset key")
    if key.startswith("admin-") or key == "organizer-approvals":
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        scope = "admin"
    elif key.startswith("organizer-"):
        if current_user.get("role") != "organizer":
            raise HTTPException(status_code=403, detail="Organizer access required")
        scope = str(current_user["_id"])
    elif key.startswith("mentor-"):
        if current_user.get("role") != "mentor":
            raise HTTPException(status_code=403, detail="Mentor access required")
        scope = str(current_user["_id"])
    elif key.startswith("student-"):
        if current_user.get("role") != "student":
            raise HTTPException(status_code=403, detail="Student access required")
        scope = str(current_user["_id"])
    else:
        scope = str(current_user["_id"])
    await get_db().ui_data.update_one(
        {"userId": scope, "key": key},
        {"$set": {"data": payload.data, "updatedAt": datetime.utcnow()},
         "$setOnInsert": {"userId": scope, "key": key}},
        upsert=True,
    )
    return {"success": True}
