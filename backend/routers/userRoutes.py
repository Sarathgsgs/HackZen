import html
import json
import re
from uuid import uuid4
from datetime import datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from core.security import create_access_token
from core.dependencies import with_auth
from core.config import settings
from schemas.userSchema import (
    UserCreate,
    UserMyResponse,
    UserResponse,
    TokenResponse,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from services.userService import UserService

router = APIRouter()


def _token_response(user):
    token = create_access_token({"sub": str(user["_id"]), "email": user["email"], "role": user["role"]})
    return TokenResponse(token=token, user=UserResponse(**user))


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=True,
)
async def register(user_data: UserCreate):
    from database import get_db

    db = get_db()

    # Verify platform public registration policy
    settings_doc = await db["settings"].find_one({"key": "global_config"})
    if settings_doc and settings_doc.get("publicRegistrations") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public student and organizer registrations are temporarily closed by platform administration.",
        )

    try:
        user_dict = await UserService.create_user(user_data)
        return UserResponse(**user_dict)
    except ValueError as e:
        err_msg = str(e)
        if "already registered" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse, response_model_by_alias=True)
async def login(credentials: LoginRequest, request: Request):
    from database import get_db

    db = get_db()
    clean_email = str(credentials.email).strip().lower()
    client_ip = request.client.host if request.client else "127.0.0.1"

    # 1. Fetch current global security policies
    settings_doc = await db["settings"].find_one({"key": "global_config"})
    if not settings_doc:
        settings_doc = {}

    max_attempts_str = str(settings_doc.get("maxLoginAttempts", "5 Attempts"))
    max_attempts_match = re.search(r"\d+", max_attempts_str)
    max_attempts = int(max_attempts_match.group(0)) if max_attempts_match else 5

    lockout_str = str(settings_doc.get("lockoutDuration", "15 Minutes"))
    if "Hour" in lockout_str:
        lockout_hours_match = re.search(r"\d+", lockout_str)
        lockout_minutes = (
            int(lockout_hours_match.group(0)) if lockout_hours_match else 1
        ) * 60
    else:
        lockout_min_match = re.search(r"\d+", lockout_str)
        lockout_minutes = int(lockout_min_match.group(0)) if lockout_min_match else 15

    # 2. Check failed login attempts lockout window
    cutoff = datetime.utcnow() - timedelta(minutes=lockout_minutes)
    recent_failed_attempts = await db["login_attempts"].count_documents(
        {"email": clean_email, "success": False, "timestamp": {"$gte": cutoff}}
    )

    if recent_failed_attempts >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Security Lockout: Account locked due to {recent_failed_attempts} failed login attempts. Security protocol requires waiting {lockout_str} before retrying.",
        )

    # 3. Authenticate User
    user = await UserService.authenticate_user(credentials.email, credentials.password)
    if not user:
        # Record failed attempt
        await db["login_attempts"].insert_one(
            {
                "email": clean_email,
                "ip": client_ip,
                "timestamp": datetime.utcnow(),
                "success": False,
            }
        )
        attempts_left = max(0, max_attempts - (recent_failed_attempts + 1))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password. {attempts_left} attempt(s) remaining before security lockout.",
        )

    # Clear failed login attempts on successful password
    await db["login_attempts"].delete_many({"email": clean_email})

    # Normalize role to lowercase so seeded uppercase values work
    user_role = str(user.get("role", "")).lower()
    user["role"] = user_role  # persist normalized role for token + response

    # 4. Session Timeout Calculation
    session_timeout_str = str(settings_doc.get("sessionTimeout", "30 Minutes"))
    if "Hour" in session_timeout_str:
        timeout_match = re.search(r"\d+", session_timeout_str)
        timeout_minutes = (int(timeout_match.group(0)) if timeout_match else 1) * 60
    else:
        timeout_match = re.search(r"\d+", session_timeout_str)
        timeout_minutes = int(timeout_match.group(0)) if timeout_match else 30

    expires_delta = (
        timedelta(minutes=timeout_minutes)
        if user_role in ["admin", "superadmin"]
        else timedelta(days=7)
    )

    # 6. Create Active Session Record in MongoDB
    session_id = f"sess-{uuid4().hex[:8]}"
    user_agent = request.headers.get("user-agent", "Chrome / Windows")
    device = (
        "Chrome / Windows"
        if "Windows" in user_agent
        else (
            "Safari / macOS"
            if "Macintosh" in user_agent
            else (
                "Chrome / Android"
                if "Android" in user_agent
                else "Safari / iOS" if "iPhone" in user_agent else "Browser / Desktop"
            )
        )
    )

    session_doc = {
        "sessionId": session_id,
        "userId": str(user["_id"]),
        "email": user["email"],
        "device": device,
        "location": "Chennai, India",
        "ip": client_ip,
        "lastActive": datetime.utcnow(),
        "revoked": False,
        "createdAt": datetime.utcnow(),
    }
    await db["admin_sessions"].insert_one(session_doc)

    token_data = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "sessionId": session_id,
    }

    token = create_access_token(token_data, expires_delta=expires_delta)

    return TokenResponse(
        token=token,
        user=UserResponse(**user),
        requires2FA=False,
        message="Authentication successful.",
    )


@router.get("/me", response_model=UserMyResponse, response_model_by_alias=True)
async def get_my_user_info(current_user: Dict[str, Any] = Depends(with_auth)):
    if not current_user.get("name"):
        email = current_user.get("email", "")
        current_user["name"] = email.split("@")[0].capitalize() if email else "User"
    current_user["role"] = str(current_user.get("role", "student")).lower()
    return UserMyResponse(**current_user)


@router.get("/my-notifications")
async def get_my_notifications(current_user: dict = Depends(with_auth)):
    """Fetch notifications and announcements targeted to this user's role."""
    from database import get_db

    db = get_db()
    user_role = current_user.get("role", "student")

    cursor = (
        db["notifications"]
        .find({"target_audience": {"$in": ["all", user_role]}})
        .sort("_id", -1)
        .limit(10)
    )

    notifications = await cursor.to_list(10)

    formatted_notifications = []
    seen_keys = set()
    for n in notifications:
        title = str(n.get("title", "New Announcement")).strip()
        msg = str(n.get("message", "")).strip()
        key = (title.lower(), msg.lower())
        if key in seen_keys:
            continue
        seen_keys.add(key)

        c_at = n.get("createdAt") or n.get("created_at")
        if isinstance(c_at, datetime):
            iso_str = c_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        elif isinstance(c_at, str) and "T" in c_at:
            iso_str = c_at if (c_at.endswith("Z") or "+" in c_at) else f"{c_at}Z"
        else:
            iso_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        formatted_notifications.append(
            {
                "id": str(n["_id"]),
                "title": title,
                "message": msg,
                "time": iso_str,
                "createdAt": iso_str,
                "isRead": (
                    current_user.get("sub") in n.get("readBy", [])
                    if current_user.get("sub")
                    else False
                ),
            }
        )

    return formatted_notifications


@router.put("/my-notifications/read")
async def mark_notifications_as_read(current_user: dict = Depends(with_auth)):
    """Mark all notifications as read for the current user."""
    from database import get_db

    db = get_db()
    user_id = current_user["sub"]
    user_role = current_user.get("role", "student")

    result = await db["notifications"].update_many(
        {"target_audience": {"$in": ["all", user_role]}, "readBy": {"$ne": user_id}},
        {"$addToSet": {"readBy": user_id}},
    )

    return {"success": True, "marked_count": result.modified_count}


@router.post("/forgot-password")
async def forgot_password(request_data: ForgotPasswordRequest):
    """Handle password reset requests gracefully with security tokens and audit logging."""
    from database import get_db
    import uuid

    db = get_db()
    email_clean = str(request_data.email).strip().lower()

    user = await db["users"].find_one({"email": email_clean})
    if not user:
        return {
            "success": True,
            "message": f"If an account is associated with {email_clean}, a password reset link has been dispatched.",
        }

    reset_token = f"rst-{uuid.uuid4().hex}"
    await db["password_resets"].insert_one(
        {
            "userId": str(user["_id"]),
            "email": email_clean,
            "token": reset_token,
            "used": False,
            "createdAt": datetime.utcnow(),
        }
    )

    return {
        "success": True,
        "message": f"Password reset instructions have been sent to {email_clean}.",
    }


@router.post("/reset-password")
async def reset_password(request_data: ResetPasswordRequest):
    """Verify reset token and update user password securely."""
    from database import get_db
    from core.security import get_password_hash
    from bson import ObjectId

    db = get_db()
    token_doc = await db["password_resets"].find_one({"token": request_data.token, "used": False})
    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    # Check expiration (valid for 2 hours)
    created_at = token_doc.get("createdAt")
    if created_at and (datetime.utcnow() - created_at) > timedelta(hours=2):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired. Please request a new one.",
        )

    user_id = token_doc.get("userId")
    user_query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"email": token_doc.get("email")}
    hashed_pwd = get_password_hash(request_data.newPassword)

    await db["users"].update_one(user_query, {"$set": {"password": hashed_pwd, "updatedAt": datetime.utcnow()}})
    await db["password_resets"].update_one({"_id": token_doc["_id"]}, {"$set": {"used": True, "usedAt": datetime.utcnow()}})

    return {
        "success": True,
        "message": "Password has been successfully reset. You can now log in with your new password.",
    }
