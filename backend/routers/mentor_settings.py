import re
from datetime import datetime, timezone
from typing import Any, Dict
from urllib.parse import urlparse

from bson import ObjectId

from fastapi import APIRouter, Body, Depends, HTTPException, status

from core.dependencies import with_auth
from database import get_db

router = APIRouter()

DEFAULTS = {
    "legalName": "Dr. Arun Kumar", "institution": "ABC Technologies", "experienceYears": 8,
    "currentStatus": "Active Mentor", "linkedinUrl": "https://www.linkedin.com/in/arunkumar",
    "githubUrl": "https://github.com/arunkumar", "contactNumber": "+91 98765 43210",
    "contactNumberVisibility": "visible",
    "expertiseDomains": ["Artificial Intelligence", "Machine Learning", "Data Science"],
    "bio": "Experienced technology mentor specializing in AI, machine learning and software development with experience guiding student hackathon teams.",
    "availabilityStatus": "Available", "availableDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "startTime": "18:00", "endTime": "21:00", "maximumActiveTeams": 5,
    "preferredDomains": ["Artificial Intelligence", "Machine Learning", "Web Development"],
    "preferredProjectStages": ["Development", "Testing", "Deployment"],
    "preferredCommunication": ["Chat", "Video Meeting"],
    "notifications": {"newTeamRequests": True, "newChatMessages": True, "feedbackReminders": True, "meetingReminders": True, "milestoneUpdates": True, "pendingReviews": True, "emailNotifications": True, "inAppNotifications": True},
    "profileVisibility": "Visible to Assigned Teams",
}
STAGES = {"Ideation", "Planning", "Development", "Testing", "Deployment", "Final Submission"}
COMMUNICATION = {"Chat", "Video Meeting", "Email"}
NOTIFICATIONS = set(DEFAULTS["notifications"])
PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9\s().-]{6,19}$")


def _mentor_only(user: Dict[str, Any]) -> str:
    if user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Mentor access required")
    return str(user["_id"])


def _valid_url(value: str, domain: str) -> bool:
    try:
        parsed = urlparse(value)
        host = (parsed.hostname or "").lower()
        return parsed.scheme in {"http", "https"} and (host == domain or host.endswith(f".{domain}"))
    except ValueError:
        return False


def _validate(payload: Dict[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    string_fields = {"legalName": 120, "institution": 160, "currentStatus": 60, "bio": 1000}
    for key, limit in string_fields.items():
        if key in payload:
            value = payload[key]
            if not isinstance(value, str) or len(value.strip()) > limit:
                raise HTTPException(status_code=422, detail=f"Invalid {key}")
            result[key] = value.strip()
    if "experienceYears" in payload:
        value = payload["experienceYears"]
        if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= 80:
            raise HTTPException(status_code=422, detail="Experience must be between 0 and 80")
        result["experienceYears"] = value
    for key, domain in (("linkedinUrl", "linkedin.com"), ("githubUrl", "github.com")):
        if key in payload:
            if not isinstance(payload[key], str) or not _valid_url(payload[key], domain):
                raise HTTPException(status_code=422, detail=f"Enter a valid {domain} profile URL")
            result[key] = payload[key].strip()
    if "contactNumber" in payload:
        value = payload["contactNumber"]
        if not isinstance(value, str) or not PHONE_PATTERN.fullmatch(value.strip()):
            raise HTTPException(status_code=422, detail="Enter a valid contact number")
        result["contactNumber"] = value.strip()
    if payload.get("contactNumberVisibility") in {"visible", "hidden"}:
        result["contactNumberVisibility"] = payload["contactNumberVisibility"]
    elif "contactNumberVisibility" in payload:
        raise HTTPException(status_code=422, detail="Invalid contact visibility")
    if payload.get("availabilityStatus") in {"Available", "Busy", "Away"}:
        result["availabilityStatus"] = payload["availabilityStatus"]
    elif "availabilityStatus" in payload:
        raise HTTPException(status_code=422, detail="Invalid availability status")
    for key, allowed in (("availableDays", {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}), ("preferredProjectStages", STAGES), ("preferredCommunication", COMMUNICATION)):
        if key in payload:
            value = payload[key]
            if not isinstance(value, list) or not all(isinstance(item, str) and item in allowed for item in value):
                raise HTTPException(status_code=422, detail=f"Invalid {key}")
            result[key] = list(dict.fromkeys(value))
    for key in ("expertiseDomains", "preferredDomains"):
        if key in payload:
            value = payload[key]
            if not isinstance(value, list) or len(value) > 30 or not all(isinstance(item, str) and 1 <= len(item.strip()) <= 80 for item in value):
                raise HTTPException(status_code=422, detail=f"Invalid {key}")
            result[key] = list(dict.fromkeys(item.strip() for item in value))
    for key in ("startTime", "endTime"):
        if key in payload:
            value = payload[key]
            if not isinstance(value, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
                raise HTTPException(status_code=422, detail=f"Invalid {key}")
            result[key] = value
    if "maximumActiveTeams" in payload:
        value = payload["maximumActiveTeams"]
        if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 100:
            raise HTTPException(status_code=422, detail="Maximum active teams must be between 1 and 100")
        result["maximumActiveTeams"] = value
    if "profileVisibility" in payload:
        if payload["profileVisibility"] not in {"Visible to Assigned Teams", "Private"}:
            raise HTTPException(status_code=422, detail="Invalid profile visibility")
        result["profileVisibility"] = payload["profileVisibility"]
    if "notifications" in payload:
        value = payload["notifications"]
        if not isinstance(value, dict) or any(key not in NOTIFICATIONS or not isinstance(enabled, bool) for key, enabled in value.items()):
            raise HTTPException(status_code=422, detail="Invalid notification settings")
        result["notifications"] = value
    return result


async def _settings(user_id: str) -> Dict[str, Any]:
    db = get_db()
    profile = await db.mentors.find_one({"userId": user_id}) or {}
    user = await db.users.find_one({"_id": ObjectId(user_id)}) or {}
    saved = await db.user_settings.find_one({"userId": user_id}) or {}
    mentor = saved.get("mentor", {})
    return {
        **DEFAULTS, **mentor,
        "legalName": user.get("name") or DEFAULTS["legalName"],
        "institution": profile.get("companyName") or DEFAULTS["institution"],
        "experienceYears": profile.get("experienceYears", DEFAULTS["experienceYears"]),
        "currentStatus": profile.get("currentStatus", DEFAULTS["currentStatus"]),
        "linkedinUrl": profile.get("linkedinUrl") or DEFAULTS["linkedinUrl"],
        "githubUrl": profile.get("githubUrl") or DEFAULTS["githubUrl"],
        "contactNumber": profile.get("phoneNumber") or DEFAULTS["contactNumber"],
        "expertiseDomains": profile.get("expertiseDomains") or DEFAULTS["expertiseDomains"],
        "bio": profile.get("bio") or DEFAULTS["bio"],
        "notifications": {**DEFAULTS["notifications"], **mentor.get("notifications", {})},
    }


@router.get("/settings")
async def get_mentor_settings(current_user: Dict[str, Any] = Depends(with_auth)):
    return {"settings": await _settings(_mentor_only(current_user))}


@router.put("/settings")
async def save_mentor_settings(payload: Dict[str, Any] = Body(default={}), current_user: Dict[str, Any] = Depends(with_auth)):
    user_id = _mentor_only(current_user)
    values = _validate(payload)
    db = get_db()
    profile_map = {"institution": "companyName", "experienceYears": "experienceYears", "currentStatus": "currentStatus", "linkedinUrl": "linkedinUrl", "githubUrl": "githubUrl", "contactNumber": "phoneNumber", "expertiseDomains": "expertiseDomains", "bio": "bio"}
    profile_updates = {target: values[source] for source, target in profile_map.items() if source in values}
    if "availabilityStatus" in values:
        profile_updates["availability"] = "Offline" if values["availabilityStatus"] == "Away" else values["availabilityStatus"]
    now = datetime.now(timezone.utc)
    if "legalName" in values:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"name": values["legalName"]}})
    if profile_updates:
        await db.mentors.update_one({"userId": user_id}, {"$set": {**profile_updates, "updatedAt": now}, "$setOnInsert": {"userId": user_id, "createdAt": now}}, upsert=True)
    settings_keys = set(values) - set(profile_map) - {"legalName"}
    settings_updates = {f"mentor.{key}": values[key] for key in settings_keys}
    if settings_updates:
        await db.user_settings.update_one({"userId": user_id}, {"$set": {**settings_updates, "updatedAt": now}, "$setOnInsert": {"userId": user_id, "createdAt": now}}, upsert=True)
    return {"success": True, "settings": await _settings(user_id)}
