from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from core.dependencies import RequireRole
from database import get_db
from services.file_upload import file_upload_service

router = APIRouter()


def _student_id(current_user: Dict[str, Any]) -> str:
    user_id = current_user.get("sub") or current_user.get("id") or current_user.get("_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student identity is missing.")
    return str(user_id)


async def _require_team_member(team_id: str, user_id: str):
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID.")
    db = get_db()
    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")
    membership = await db["teamMembers"].find_one({"teamId": team_id, "userId": user_id})
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this team.")
    return db, team


def _serialize_file(document: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "teamId": document["teamId"],
        "fileName": document["fileName"],
        "contentType": document["contentType"],
        "extension": document["extension"],
        "size": document["size"],
        "uploadedBy": document["uploadedBy"],
        "uploadedAt": document["uploadedAt"],
    }


@router.get("/team/{team_id}", response_model=List[Dict[str, Any]])
async def list_team_files(
    team_id: str, current_user: dict = Depends(RequireRole(["student"]))
):
    user_id = _student_id(current_user)
    db, _ = await _require_team_member(team_id, user_id)
    cursor = db["teamFiles"].find({"teamId": team_id}).sort("uploadedAt", -1)
    files = await cursor.to_list(500)
    return [_serialize_file(document) for document in files]


@router.post("/team/{team_id}", status_code=status.HTTP_201_CREATED)
async def upload_team_file(
    team_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(RequireRole(["student"])),
):
    user_id = _student_id(current_user)
    db, _ = await _require_team_member(team_id, user_id)
    storage_name, original_name, file_size, content_type = await file_upload_service.save_shared_file(file)

    user = None
    if ObjectId.is_valid(user_id):
        user = await db["users"].find_one({"_id": ObjectId(user_id)}, {"name": 1})
    document = {
        "teamId": team_id,
        "fileName": original_name,
        "storageName": storage_name,
        "contentType": content_type,
        "extension": original_name.rsplit(".", 1)[-1].upper(),
        "size": file_size,
        "uploadedById": user_id,
        "uploadedBy": (user or {}).get("name") or current_user.get("name") or "Team member",
        "uploadedAt": datetime.now(timezone.utc),
    }
    try:
        result = await db["teamFiles"].insert_one(document)
    except Exception:
        file_upload_service.get_shared_file_path(storage_name).unlink(missing_ok=True)
        raise
    document["_id"] = result.inserted_id
    return _serialize_file(document)


@router.get("/{file_id}/download")
async def download_team_file(
    file_id: str, current_user: dict = Depends(RequireRole(["student"]))
):
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    user_id = _student_id(current_user)
    db = get_db()
    document = await db["teamFiles"].find_one({"_id": ObjectId(file_id)})
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    await _require_team_member(str(document.get("teamId", "")), user_id)
    path = file_upload_service.get_shared_file_path(document.get("storageName", ""))
    return FileResponse(
        path,
        media_type=document.get("contentType", "application/octet-stream"),
        filename=document.get("fileName", "download"),
    )
