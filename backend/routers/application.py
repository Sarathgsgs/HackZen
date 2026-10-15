from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationStatus,
)
from models.application import ApplicationInDB

router = APIRouter()


def get_application_collection():
    return get_db()["applications"]


@router.post(
    "/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED
)
async def create_application(
    app_data: ApplicationCreate, current_user: dict = Depends(RequireRole(["student"]))
):
    """Apply for a hackathon"""

    current_user_id = str(current_user.get("sub") or current_user.get("id"))
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated student user is missing from the token.",
        )

    db = get_db()
    if not ObjectId.is_valid(app_data.hackathonId):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found.")

    hackathon = await db["hackathons"].find_one({"_id": ObjectId(app_data.hackathonId)})
    if not hackathon or not hackathon.get("isPublic", True):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found.")

    event_status = str(hackathon.get("status", "")).strip().lower()
    if event_status in {"draft", "completed", "results announced", "judging", "ongoing", "registration closed", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration is not open for this hackathon.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    registration_start = hackathon.get("registrationStart")
    registration_end = hackathon.get("registrationEnd")
    if registration_start and registration_start.tzinfo:
        registration_start = registration_start.astimezone(timezone.utc).replace(tzinfo=None)
    if registration_end and registration_end.tzinfo:
        registration_end = registration_end.astimezone(timezone.utc).replace(tzinfo=None)
    if registration_start and now < registration_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration has not started yet.")
    if registration_end and now > registration_end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The registration deadline has passed.")

    if app_data.teamSize is not None:
        minimum = int(hackathon.get("minTeamSize", 1))
        maximum = int(hackathon.get("maxTeamSize", 4))
        if not minimum <= app_data.teamSize <= maximum:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team size must be between {minimum} and {maximum} members.",
            )

    if app_data.teamId:
        if not ObjectId.is_valid(app_data.teamId):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID.")
        team = await db["teams"].find_one({"_id": ObjectId(app_data.teamId), "hackathonId": app_data.hackathonId})
        membership = await db["teamMembers"].find_one({"teamId": app_data.teamId, "userId": current_user_id})
        if not team or not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be a member of this hackathon team to register it.")

    collection = db["applications"]

    existing = await collection.find_one(
        {"hackathonId": app_data.hackathonId, "userId": current_user_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this hackathon.",
        )

    app_dict = app_data.model_dump(by_alias=True)
    app_dict["userId"] = current_user_id
    app_dict["status"] = ApplicationStatus.PENDING.value
    app_dict["appliedAt"] = datetime.utcnow()

    result = await collection.insert_one(app_dict)
    app_dict["_id"] = str(result.inserted_id)

    return ApplicationResponse(**app_dict)


@router.get("/my", response_model=List[ApplicationResponse])
async def get_my_applications(current_user: dict = Depends(with_auth)):
    """Get all applications by current user"""
    collection = get_application_collection()
    cursor = collection.find({"userId": current_user["sub"]}).sort("appliedAt", -1)
    apps = await cursor.to_list(100)

    for app in apps:
        app["_id"] = str(app["_id"])

    return [ApplicationResponse(**app) for app in apps]


@router.get("/hackathon/{hackathon_id}", response_model=List[ApplicationResponse])
async def get_hackathon_applications(
    hackathon_id: str, current_user: dict = Depends(RequireRole(["organizer", "admin"]))
):
    """Get all applications for a hackathon (Organizer only)"""

    collection = get_application_collection()
    cursor = collection.find({"hackathonId": hackathon_id})
    apps = await cursor.to_list(1000)

    for app in apps:
        app["_id"] = str(app["_id"])

    return [ApplicationResponse(**app) for app in apps]
