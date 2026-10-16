from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, HTTPException, status

from core.dependencies import with_auth
from database import get_db


router = APIRouter()

# Only preference fields exposed by the student settings page may be persisted.
# This prevents arbitrary request data from being added to the settings document.
DEFAULT_STUDENT_SETTINGS = {
    "profileMode": "Public",
    "emailNotifications": True,
    "pushNotifications": False,
    "theme": "Purple Dark",
    "accessibilityMode": False,
    "contentLanguage": "English (US)",
    "twoFactorEnabled": True,
    "dataSharing": True,
}

DEFAULT_MENTOR_SETTINGS = {
    "availabilityStatus": "Available",
    "availableDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "startTime": "18:00",
    "endTime": "21:00",
    "maximumActiveTeams": 5,
    "notifications": {
        "newTeamRequests": True,
        "newChatMessages": True,
        "feedbackReminders": True,
        "meetingReminders": True,
        "milestoneUpdates": True,
        "pendingReviews": True,
        "emailNotifications": True,
        "inAppNotifications": True,
    },
    "preferredDomains": [],
    "preferredProjectStages": [],
    "preferredCommunication": [],
    "profileVisibility": "Visible to Assigned Teams",
    "contactNumberVisibility": "Visible",
}


def _student_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Return only valid student preference values from a request payload."""
    saved: Dict[str, Any] = {}
    for key, default in DEFAULT_STUDENT_SETTINGS.items():
        if key not in payload:
            continue
        value = payload[key]
        if isinstance(default, bool) and isinstance(value, bool):
            saved[key] = value
        elif isinstance(default, str) and isinstance(value, str):
            saved[key] = value.strip()
    return saved


def _mentor_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Whitelist and validate the values exposed by Mentor Settings."""
    saved: Dict[str, Any] = {}
    string_choices = {
        "availabilityStatus": {"Available", "Busy", "Away"},
        "profileVisibility": {"Visible to Assigned Teams", "Private"},
        "contactNumberVisibility": {"Visible", "Hidden"},
    }
    list_choices = {
        "availableDays": {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"},
        "preferredDomains": {"Artificial Intelligence", "Machine Learning", "Web Development", "Mobile Development", "Cyber Security", "IoT"},
        "preferredProjectStages": {"Ideation", "Planning", "Development", "Testing", "Final Submission"},
        "preferredCommunication": {"Chat", "Video Meeting", "Email"},
    }
    for key, allowed in string_choices.items():
        if payload.get(key) in allowed:
            saved[key] = payload[key]
    for key, allowed in list_choices.items():
        value = payload.get(key)
        if isinstance(value, list) and all(isinstance(item, str) and item in allowed for item in value):
            saved[key] = list(dict.fromkeys(value))
    for key in ("startTime", "endTime"):
        value = payload.get(key)
        if isinstance(value, str) and len(value) == 5 and value[2] == ":":
            saved[key] = value
    maximum_teams = payload.get("maximumActiveTeams")
    if isinstance(maximum_teams, int) and not isinstance(maximum_teams, bool) and 1 <= maximum_teams <= 100:
        saved["maximumActiveTeams"] = maximum_teams
    notifications = payload.get("notifications")
    if isinstance(notifications, dict):
        permitted = DEFAULT_MENTOR_SETTINGS["notifications"]
        saved_notifications = {
            key: value for key, value in notifications.items()
            if key in permitted and isinstance(value, bool)
        }
        if saved_notifications:
            saved["notifications"] = saved_notifications
    return saved


def _require_mentor(current_user: Dict[str, Any]) -> None:
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Mentor access required")


@router.get("/me")
async def get_my_settings(current_user: Dict[str, Any] = Depends(with_auth)):
    """Fetch the logged-in user's settings, with defaults for unset values."""
    user_id = str(current_user["_id"])
    collection = get_db()["user_settings"]
    document = await collection.find_one({"userId": user_id})

    stored_settings = (document or {}).get("student", {})
    return {"settings": {**DEFAULT_STUDENT_SETTINGS, **stored_settings}}


@router.put("/me")
async def update_my_settings(
    payload: Dict[str, Any] = Body(default={}),
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """Merge the logged-in student's preferences into their MongoDB document."""
    changes = _student_settings(payload)
    user_id = str(current_user["_id"])
    collection = get_db()["user_settings"]

    if changes:
        await collection.update_one(
            {"userId": user_id},
            {
                "$set": {
                    **{f"student.{key}": value for key, value in changes.items()},
                    "updatedAt": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"userId": user_id, "createdAt": datetime.now(timezone.utc)},
            },
            upsert=True,
        )

    document = await collection.find_one({"userId": user_id})
    stored_settings = (document or {}).get("student", {})
    return {"success": True, "settings": {**DEFAULT_STUDENT_SETTINGS, **stored_settings}}


@router.get("/mentor")
async def get_my_mentor_settings(current_user: Dict[str, Any] = Depends(with_auth)):
    """Fetch the logged-in mentor's additional settings from MongoDB."""
    _require_mentor(current_user)
    document = await get_db()["user_settings"].find_one({"userId": str(current_user["_id"])})
    stored_settings = (document or {}).get("mentor", {})
    notifications = {**DEFAULT_MENTOR_SETTINGS["notifications"], **stored_settings.get("notifications", {})}
    return {"settings": {**DEFAULT_MENTOR_SETTINGS, **stored_settings, "notifications": notifications}}


@router.put("/mentor")
async def update_my_mentor_settings(
    payload: Dict[str, Any] = Body(default={}),
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """Merge the logged-in mentor's settings into their MongoDB document."""
    _require_mentor(current_user)
    changes = _mentor_settings(payload)
    user_id = str(current_user["_id"])
    collection = get_db()["user_settings"]
    if changes:
        await collection.update_one(
            {"userId": user_id},
            {
                "$set": {**{f"mentor.{key}": value for key, value in changes.items()}, "updatedAt": datetime.now(timezone.utc)},
                "$setOnInsert": {"userId": user_id, "createdAt": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
    document = await collection.find_one({"userId": user_id})
    stored_settings = (document or {}).get("mentor", {})
    notifications = {**DEFAULT_MENTOR_SETTINGS["notifications"], **stored_settings.get("notifications", {})}
    return {"success": True, "settings": {**DEFAULT_MENTOR_SETTINGS, **stored_settings, "notifications": notifications}}
