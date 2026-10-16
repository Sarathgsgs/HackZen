from __future__ import annotations

from fastapi import Depends, Security, HTTPException, status, Request
from typing import List, Dict, Any, Optional
from datetime import datetime
from core.security import get_current_user
from services.userService import UserService
from database import get_db

try:
    from ai.init import AIContainer
    from ai.services.ai_service import AIService
    from ai.services.dataset_service import DatasetService
    from ai.services.memory_service import MemoryService
except Exception:
    try:
        from backend.ai.init import AIContainer
        from backend.ai.services.ai_service import AIService
        from backend.ai.services.dataset_service import DatasetService
        from backend.ai.services.memory_service import MemoryService
    except Exception:
        AIContainer = Any
        AIService = Any
        DatasetService = Any
        MemoryService = Any


async def with_auth(
    current_user_payload: Dict[str, Any] = Security(get_current_user),
) -> Dict[str, Any]:
    user_id = current_user_payload.get("id") or current_user_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    # Check if session has been revoked by admin
    session_id = current_user_payload.get("sessionId")
    if session_id:
        db = get_db()
        revoked_sess = await db["admin_sessions"].find_one(
            {"sessionId": session_id, "revoked": True}
        )
        if revoked_sess:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This administrator session has been revoked. Please sign in again.",
            )
        # Update lastActive timestamp
        await db["admin_sessions"].update_one(
            {"sessionId": session_id}, {"$set": {"lastActive": datetime.utcnow()}}
        )

    if current_user_payload.get("is_mock"):
        return {
            "_id": user_id,
            "sub": user_id,
            "id": user_id,
            "email": current_user_payload.get("email"),
            "role": current_user_payload.get("role", "student"),
            "name": current_user_payload.get("email", "Mock User"),
        }

    user = await UserService.get_user_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    # Ensure backward compatibility with code expecting 'id' and 'sub'
    user["id"] = str(user.get("_id") or user.get("id") or user_id)
    user["sub"] = str(user.get("_id") or user.get("id") or user_id)
    user["role"] = str(user.get("role", "student")).lower()

    # Presence tracking for authenticated users
    try:
        await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"lastActive": datetime.utcnow()}})
        user["lastActive"] = datetime.utcnow()
    except Exception:
        pass

    return user


class RequireRole:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.lower() for r in allowed_roles]

    async def __call__(self, user: Dict[str, Any] = Security(get_current_user)):
        user_role = str(user.get("role", "")).lower()
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
            )

        session_id = user.get("sessionId")
        if session_id:
            db = get_db()
            revoked_sess = await db["admin_sessions"].find_one(
                {"sessionId": session_id, "revoked": True}
            )
            if revoked_sess:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="This administrator session has been revoked. Please sign in again.",
                )

        user["id"] = str(user.get("id") or user.get("sub"))
        user["sub"] = str(user.get("sub") or user.get("id"))
        return user


def get_ai_container(request: Request) -> Any:
    container = getattr(request.app.state, "ai_container", None)
    if container is None:
        raise RuntimeError("AI container has not been initialized")
    return container


def get_ai_service(container: Any = Depends(get_ai_container)) -> Any:
    return getattr(container, "ai_service", None)


def get_memory_service(container: Any = Depends(get_ai_container)) -> Any:
    return getattr(container, "memory_service", None)


def get_dataset_service(container: Any = Depends(get_ai_container)) -> Any:
    return getattr(container, "dataset_service", None)
