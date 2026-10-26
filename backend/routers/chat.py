
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Body,
    WebSocket,
    WebSocketDisconnect,
    Query,
    UploadFile,
    File,
    Form,
    Header,
    Request,
    Response,
)
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
import os
import uuid

from core.dependencies import with_auth
from core.security import verify_token, sanitize_input
from database import get_db
from schemas.chat import (
    ChatMessageResponse,
    ChatMessageSend,
    TeamFileResponse,
    MessageType,
)
from services.file_upload import file_upload_service

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, team_id: str, user_id: str):
        await websocket.accept()
        self.active_connections.setdefault(team_id, {})[user_id] = websocket

    def disconnect(self, team_id: str, user_id: str):
        connections = self.active_connections.get(team_id)
        if connections and user_id in connections:
            del connections[user_id]
            if not connections:
                del self.active_connections[team_id]

    async def broadcast_to_team(
        self, message: dict, team_id: str, sender_id: str = None
    ):
        connections = self.active_connections.get(team_id, {})
        failed_users = []

        for user_id, connection in list(connections.items()):
            if user_id == sender_id:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                failed_users.append(user_id)

        for user_id in failed_users:
            self.disconnect(team_id, user_id)


manager = ConnectionManager()


async def _can_access_team(db, team_id: str, user_id: str, role: str = ""):
    """Allow team members, the assigned mentor, and admins to access team records."""
    team = None

    if ObjectId.is_valid(team_id):
        team = await db["teams"].find_one({"_id": ObjectId(team_id)})

    if not team:
        team = await db["teams"].find_one({"_id": team_id})

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if role == "admin" or str(team.get("mentorId", "")) == str(user_id):
        return team

    team_id_values = [str(team.get("_id", team_id)), team_id]
    membership = await db["teamMembers"].find_one({
        "teamId": {"$in": team_id_values},
        "userId": str(user_id),
    })

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this team workspace",
        )

    return team


def _user_id(user: dict) -> str:
    return str(user.get("id") or user.get("sub") or user.get("_id") or "")


def _message_type(value):
    try:
        return MessageType(value or "text")
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported chat message type.",
        )


@router.post("/{team_id}/send", response_model=ChatMessageResponse)
async def send_team_message_student(
    team_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Persist a team chat message for the student workspace."""
    content = sanitize_input(str(payload.get("content", "") or "")).strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat message content cannot be empty.",
        )

    db = get_db()
    sender_id = _user_id(current_user)
    await _can_access_team(db, team_id, sender_id, current_user.get("role", ""))

    sender_name = (
        current_user.get("name")
        or current_user.get("fullName")
        or current_user.get("email")
        or "Team member"
    )
    message_type = _message_type(
        payload.get("type") or payload.get("messageType") or "text"
    )

    msg_data = {
        "teamId": team_id,
        "senderId": sender_id,
        "senderName": sender_name,
        "content": content,
        "messageType": message_type.value,
        "isCheckpoint": bool(payload.get("isCheckpoint", False)),
        "createdAt": datetime.utcnow(),
    }

    result = await db["chats"].insert_one(msg_data)
    msg_data["_id"] = str(result.inserted_id)

    await manager.broadcast_to_team(
        {
            "type": "new_message",
            "message": {
                **msg_data,
                "createdAt": msg_data["createdAt"].isoformat(),
            },
        },
        team_id,
        sender_id,
    )

    return ChatMessageResponse(**msg_data)


@router.post(
    "/{team_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_team_message(
    team_id: str,
    payload: ChatMessageSend,
    current_user: dict = Depends(with_auth),
):
    db = get_db()
    sender_id = _user_id(current_user)
    await _can_access_team(db, team_id, sender_id, current_user.get("role", ""))

    content = sanitize_input(payload.content).strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(content) > 5000:
        raise HTTPException(status_code=400, detail="Message is too long")

    message = {
        "teamId": team_id,
        "senderId": sender_id,
        "senderName": (
            current_user.get("name")
            or current_user.get("fullName")
            or "Team member"
        ),
        "content": content,
        "messageType": payload.messageType.value,
        "isCheckpoint": False,
        "createdAt": datetime.utcnow(),
    }

    result = await db["chats"].insert_one(message)
    message["_id"] = str(result.inserted_id)

    await manager.broadcast_to_team(
        {
            "type": "new_message",
            "message": {
                **message,
                "createdAt": message["createdAt"].isoformat(),
            },
        },
        team_id,
        sender_id,
    )

    return ChatMessageResponse(**message)


@router.websocket("/ws/{team_id}/{user_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    team_id: str,
    user_id: str,
):
    """Authenticated real-time team chat."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Authentication is required")
        return

    try:
        claims = verify_token(token, "access")
        authenticated_user_id = str(claims.get("sub") or claims.get("id") or "")
        role = str(claims.get("role") or "")

        if not authenticated_user_id:
            await websocket.close(code=1008, reason="Invalid authentication token")
            return

        # Do not trust the user_id supplied in the URL.
        user_id = authenticated_user_id
        db = get_db()
        await _can_access_team(db, team_id, user_id, role)

    except HTTPException:
        await websocket.close(code=1008, reason="Unauthorized")
        return
    except Exception:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    sender_record = None
    if ObjectId.is_valid(user_id):
        sender_record = await db["users"].find_one(
            {"_id": ObjectId(user_id)}, {"name": 1, "fullName": 1}
        )

    authenticated_sender_name = (
        (sender_record or {}).get("name")
        or (sender_record or {}).get("fullName")
        or claims.get("name")
        or claims.get("email")
        or "Team member"
    )

    await manager.connect(websocket, team_id, user_id)

    try:
        while True:
            data = await websocket.receive_json()

            content = sanitize_input(str(data.get("content", "") or "")).strip()
            if not content or len(content) > 5000:
                await websocket.send_json({
                    "type": "error",
                    "message": "Messages must be between 1 and 5000 characters.",
                })
                continue

            # Recheck membership for each message so revoked access is not retained.
            try:
                await _can_access_team(db, team_id, user_id, role)
            except HTTPException:
                await websocket.close(
                    code=1008, reason="Team access has changed"
                )
                return

            message_type = _message_type(
                data.get("type") or data.get("messageType") or "text"
            )

            msg_data = {
                "teamId": team_id,
                "senderId": user_id,
                "senderName": authenticated_sender_name,
                "content": content,
                "messageType": message_type.value,
                "isCheckpoint": bool(data.get("isCheckpoint", False)),
                "createdAt": datetime.utcnow(),
            }

            result = await db["chats"].insert_one(msg_data)
            msg_data["_id"] = str(result.inserted_id)

            await manager.broadcast_to_team(
                {
                    "type": "new_message",
                    "message": {
                        **msg_data,
                        "createdAt": msg_data["createdAt"].isoformat(),
                    },
                },
                team_id,
                user_id,
            )

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(team_id, user_id)


@router.get("/{team_id}/messages", response_model=List[ChatMessageResponse])
async def get_team_messages(
    team_id: str,
    limit: int = Query(100, ge=1, le=100),
    before: Optional[datetime] = Query(None),
    current_user: dict = Depends(with_auth),
):
    """Retrieve recent team messages, optionally before a timestamp."""
    db = get_db()
    await _can_access_team(db, team_id, _user_id(current_user), current_user.get("role", ""))

    team_id_values = [team_id]
    if ObjectId.is_valid(team_id):
        team_id_values.append(ObjectId(team_id))

    message_filter: Dict[str, Any] = {
        "teamId": {"$in": team_id_values}
    }
    if before:
        message_filter["createdAt"] = {"$lt": before}

    cursor = (
        db["chats"]
        .find(message_filter)
        .sort([("createdAt", -1), ("_id", -1)])
        .limit(limit)
    )

    messages = await cursor.to_list(limit)
    messages.reverse()

    for message in messages:
        message["_id"] = str(message["_id"])
        message["teamId"] = str(message["teamId"])

    return [ChatMessageResponse(**message) for message in messages]


@router.post(
    "/{team_id}/files",
    response_model=TeamFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_team_file(
    team_id: str,
    file: UploadFile = File(...),
    message: Optional[str] = Form(None),
    current_user: dict = Depends(with_auth),
):
    db = get_db()
    uploader_id = _user_id(current_user)
    await _can_access_team(db, team_id, uploader_id, current_user.get("role", ""))

    allowed_mime_types = {
        # Images
        ".jpg": {"image/jpeg"},
        ".jpeg": {"image/jpeg"},
        ".png": {"image/png"},
        ".webp": {"image/webp"},
        ".gif": {"image/gif"},
        ".svg": {"image/svg+xml"},
        # Videos
        ".mp4": {"video/mp4"},
        ".mov": {"video/quicktime"},
        ".webm": {"video/webm"},
        # Documents
        ".pdf": {"application/pdf"},
        ".doc": {"application/msword"},
        ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
        ".ppt": {"application/vnd.ms-powerpoint"},
        ".pptx": {"application/vnd.openxmlformats-officedocument.presentationml.presentation"},
        ".xls": {"application/vnd.ms-excel"},
        ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        ".txt": {"text/plain"},
        ".md": {"text/markdown", "text/plain"},
        ".csv": {"text/csv", "application/csv", "text/plain"},
        # Code & Archives
        ".zip": {"application/zip", "application/x-zip-compressed", "application/octet-stream"},
        ".rar": {"application/x-rar-compressed", "application/octet-stream"},
        ".7z": {"application/x-7z-compressed", "application/octet-stream"},
        ".tar": {"application/x-tar", "application/octet-stream"},
        ".gz": {"application/gzip", "application/octet-stream"},
        ".py": {"text/x-python", "text/plain", "application/octet-stream"},
        ".js": {"application/javascript", "text/javascript", "text/plain"},
        ".jsx": {"text/jsx", "text/plain", "application/octet-stream"},
        ".ts": {"application/typescript", "text/plain", "application/octet-stream"},
        ".tsx": {"text/tsx", "text/plain", "application/octet-stream"},
        ".json": {"application/json", "text/plain"},
        ".html": {"text/html", "text/plain"},
        ".css": {"text/css", "text/plain"},
        ".ipynb": {"application/json", "text/plain", "application/octet-stream"},
        ".sql": {"text/plain", "application/sql", "application/octet-stream"},
    }

    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in allowed_mime_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{extension}'. Please upload common documents, code, images, or archives.",
        )

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Files must be 25 MB or smaller")

    detected_type = file.content_type or "application/octet-stream"

    target = file_upload_service.base_dir / "team-files" / team_id
    target.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{extension}"
    with open(target / stored_name, "wb") as output:
        output.write(content)

    safe_name = os.path.basename(file.filename or stored_name).replace("\x00", "")
    attachment_type = (
        "image" if extension in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
        else "video" if extension in {".mp4", ".mov", ".webm"}
        else "pdf" if extension == ".pdf"
        else "code" if extension in {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".html", ".css", ".ipynb", ".sql"}
        else "archive" if extension in {".zip", ".rar", ".7z", ".tar", ".gz"}
        else "file"
    )

    custom_caption = sanitize_input(str(message or "")).strip() if message else ""
    msg_content = custom_caption if custom_caption else f"Shared file: {safe_name}"

    record = {
        "teamId": team_id,
        "name": safe_name,
        "path": f"team-files/{team_id}/{stored_name}",
        "url": "",
        "size": len(content),
        "contentType": detected_type,
        "attachmentType": attachment_type,
        "uploadedBy": uploader_id,
        "uploadedByName": current_user.get("name") or "Team member",
        "createdAt": datetime.utcnow(),
    }

    result = await db["teamFiles"].insert_one(record)
    record["_id"] = str(result.inserted_id)
    record["url"] = f"/chat/{team_id}/files/{record['_id']}/download"

    await db["teamFiles"].update_one(
        {"_id": result.inserted_id},
        {"$set": {"url": record["url"]}},
    )

    chat_message = {
        "teamId": team_id,
        "senderId": uploader_id,
        "senderName": record["uploadedByName"],
        "content": msg_content,
        "messageType": MessageType.FILE.value,
        "isCheckpoint": False,
        "fileId": record["_id"],
        "attachmentName": record["name"],
        "attachmentUrl": record["url"],
        "attachmentType": attachment_type,
        "attachmentSize": record["size"],
        "createdAt": record["createdAt"],
    }

    chat_result = await db["chats"].insert_one(chat_message)
    chat_message["_id"] = str(chat_result.inserted_id)

    chat_message_payload = {
        **chat_message,
        "id": chat_message["_id"],
        "createdAt": chat_message["createdAt"].isoformat(),
    }

    await manager.broadcast_to_team(
        {
            "type": "new_message",
            "message": chat_message_payload,
        },
        team_id,
        uploader_id,
    )

    record["fileId"] = record["_id"]
    record["chatMessage"] = chat_message_payload

    return TeamFileResponse(**record)


@router.get("/{team_id}/files", response_model=List[TeamFileResponse])
async def get_team_files(
    team_id: str,
    current_user: dict = Depends(with_auth),
):
    db = get_db()
    await _can_access_team(db, team_id, _user_id(current_user), current_user.get("role", ""))

    files = (
        await db["teamFiles"]
        .find({"teamId": team_id})
        .sort("createdAt", -1)
        .to_list(100)
    )
    for record in files:
        record["_id"] = str(record["_id"])

    return [TeamFileResponse(**record) for record in files]


@router.get("/{team_id}/media", response_model=List[TeamFileResponse])
async def get_team_media(
    team_id: str,
    current_user: dict = Depends(with_auth),
):
    """List protected image and video attachments for the team info panel."""
    db = get_db()
    await _can_access_team(db, team_id, _user_id(current_user), current_user.get("role", ""))

    files = (
        await db["teamFiles"]
        .find({
            "teamId": team_id,
            "attachmentType": {"$in": ["image", "video"]},
        })
        .sort("createdAt", -1)
        .to_list(100)
    )
    for record in files:
        record["_id"] = str(record["_id"])

    return [TeamFileResponse(**record) for record in files]


@router.get("/{team_id}/files/{file_id}/download")
async def download_team_file(
    team_id: str,
    file_id: str,
    request: Request,
    token: Optional[str] = Query(None),
):
    """Authenticated download for team files supporting both Authorization header and query token."""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")

    # Authenticate via header or query token
    user_payload = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
        try:
            user_payload = verify_token(raw_token, "access")
        except Exception:
            pass
    if not user_payload and token:
        try:
            user_payload = verify_token(token, "access")
        except Exception:
            pass

    if not user_payload:
        raise HTTPException(status_code=401, detail="Authentication required to download file")

    user_id = str(user_payload.get("sub") or user_payload.get("id") or "")
    role = str(user_payload.get("role") or "")

    db = get_db()
    await _can_access_team(db, team_id, user_id, role)

    record = await db["teamFiles"].find_one({
        "_id": ObjectId(file_id),
        "teamId": team_id,
    })
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    base_dir = file_upload_service.base_dir.resolve()
    path = (base_dir / record["path"]).resolve()
    if not path.is_file() or base_dir not in path.parents:
        # Fallback check
        fallback_path = file_upload_service.get_shared_file_path(record.get("storageName") or record.get("path"))
        if fallback_path and fallback_path.is_file():
            path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="Stored file not found")

    safe_filename = os.path.basename(record.get("name") or "download")
    return Response(
        content=path.read_bytes(),
        media_type=record.get("contentType") or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"'
        },
    )
