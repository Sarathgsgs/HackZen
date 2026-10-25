
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


def parse_registration_date(value):
    """Parse a registration date into a naive UTC datetime."""
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    if not isinstance(value, datetime):
        return None

    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    return value


@router.get("/check/{hackathon_id}")
async def check_application_eligibility(
    hackathon_id: str, current_user: dict = Depends(with_auth)
):
    """Check whether the student can register or is already registered."""
    db = get_db()
    current_user_id = str(current_user.get("sub") or current_user.get("id"))

    hackathon = None
    if ObjectId.is_valid(hackathon_id):
        hackathon = await db["hackathons"].find_one(
            {"_id": ObjectId(hackathon_id)}
        )
    if not hackathon:
        hackathon = await db["hackathons"].find_one({"id": hackathon_id})

    if not hackathon:
        return {
            "registered": False,
            "expired": False,
            "canRegister": False,
            "reason": "Hackathon not found",
        }

    existing_app = await db["applications"].find_one(
        {"hackathonId": hackathon_id, "userId": current_user_id}
    )
    if existing_app:
        return {
            "registered": True,
            "expired": False,
            "canRegister": False,
            "reason": "Already registered for this hackathon",
            "applicationId": str(existing_app["_id"]),
            "teamId": existing_app.get("teamId"),
        }

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    registration_start = parse_registration_date(
        hackathon.get("registrationStart")
    )
    registration_end = parse_registration_date(
        hackathon.get("registrationEnd")
        or hackathon.get("registrationDeadline")
        or hackathon.get("hackathonEnd")
        or hackathon.get("endDate")
    )

    event_status = str(hackathon.get("status", "")).strip().lower()
    closed_statuses = {
        "draft",
        "completed",
        "results announced",
        "judging",
        "ongoing",
        "registration closed",
        "closed",
        "cancelled",
    }

    is_expired = (
        event_status in closed_statuses
        or (registration_start is not None and now < registration_start)
        or (registration_end is not None and now > registration_end)
    )

    if is_expired:
        return {
            "registered": False,
            "expired": True,
            "canRegister": False,
            "reason": "Registrations for this hackathon have closed",
        }

    return {
        "registered": False,
        "expired": False,
        "canRegister": True,
        "reason": "Eligible to register",
    }


@router.post(
    "/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED
)
async def create_application(
    app_data: ApplicationCreate,
    current_user: dict = Depends(RequireRole(["student"])),
):
    """Apply for a hackathon with team registration and duplicate protection."""
    db = get_db()
    current_user_id = str(current_user.get("sub") or current_user.get("id"))

    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated student user is missing from the token.",
        )

    # Validate the hackathon, supporting both MongoDB IDs and legacy IDs.
    hackathon = None
    if ObjectId.is_valid(app_data.hackathonId):
        hackathon = await db["hackathons"].find_one(
            {"_id": ObjectId(app_data.hackathonId)}
        )
    if not hackathon:
        hackathon = await db["hackathons"].find_one(
            {"id": app_data.hackathonId}
        )

    if not hackathon or not hackathon.get("isPublic", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found.",
        )

    event_status = str(hackathon.get("status", "")).strip().lower()
    closed_statuses = {
        "draft",
        "completed",
        "results announced",
        "judging",
        "ongoing",
        "registration closed",
        "closed",
        "cancelled",
    }
    if event_status in closed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is not open for this hackathon.",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    registration_start = parse_registration_date(
        hackathon.get("registrationStart")
    )
    registration_end = parse_registration_date(
        hackathon.get("registrationEnd")
        or hackathon.get("registrationDeadline")
        or hackathon.get("hackathonEnd")
        or hackathon.get("endDate")
    )

    if registration_start and now < registration_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration has not started yet.",
        )

    if registration_end and now > registration_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The registration deadline has passed.",
        )

    # Validate team size against hackathon settings.
    if app_data.teamSize is not None:
        minimum = int(hackathon.get("minTeamSize", 1))
        maximum = int(hackathon.get("maxTeamSize", 4))

        if not minimum <= app_data.teamSize <= maximum:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team size must be between {minimum} and {maximum} members.",
            )

    # Existing teams can only be registered by their members.
    if app_data.teamId:
        if not ObjectId.is_valid(app_data.teamId):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid team ID.",
            )

        team = await db["teams"].find_one(
            {
                "_id": ObjectId(app_data.teamId),
                "hackathonId": app_data.hackathonId,
            }
        )
        membership = await db["teamMembers"].find_one(
            {
                "teamId": app_data.teamId,
                "userId": current_user_id,
            }
        )

        if not team or not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of this hackathon team to register it.",
            )

    # Prevent duplicate registration.
    collection = get_application_collection()
    existing = await collection.find_one(
        {
            "hackathonId": app_data.hackathonId,
            "userId": current_user_id,
        }
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this hackathon.",
        )

    # Create a team when a team name is provided and no team was selected.
    created_team_id = app_data.teamId
    if not created_team_id and app_data.teamName and app_data.teamName.strip():
        clean_team_name = app_data.teamName.strip()
        team_doc = {
            "teamName": clean_team_name,
            "hackathonId": app_data.hackathonId,
            "leaderId": current_user_id,
            "teamSize": app_data.teamSize or 2,
            "notes": app_data.notes or "",
            "invitedEmails": app_data.memberEmails or [],
            "status": "active",
            "createdAt": datetime.utcnow(),
        }
        team_res = await db["teams"].insert_one(team_doc)
        created_team_id = str(team_res.inserted_id)

        await db["teamMembers"].insert_one(
            {
                "teamId": created_team_id,
                "userId": current_user_id,
                "role": "leader",
                "joinedAt": datetime.utcnow(),
            }
        )

    app_dict = app_data.model_dump(by_alias=True)
    app_dict["userId"] = current_user_id
    app_dict["teamId"] = created_team_id
    app_dict["status"] = ApplicationStatus.APPROVED.value
    app_dict["appliedAt"] = datetime.utcnow()

    result = await collection.insert_one(app_dict)
    app_dict["_id"] = str(result.inserted_id)

    return ApplicationResponse(**app_dict)


@router.get("/my", response_model=List[ApplicationResponse])
async def get_my_applications(current_user: dict = Depends(with_auth)):
    """Get all applications by the current user."""
    current_user_id = str(current_user.get("sub") or current_user.get("id"))
    collection = get_application_collection()
    cursor = collection.find({"userId": current_user_id}).sort("appliedAt", -1)
    apps = await cursor.to_list(100)

    results = []
    for app in apps:
        app["_id"] = str(app["_id"])
        if not app.get("appliedAt"):
            app["appliedAt"] = app.get("createdAt") or datetime.utcnow()
        status_raw = str(app.get("status", "pending")).lower()
        if status_raw in ["accepted", "accept"]:
            app["status"] = "accepted"
        elif status_raw in ["approved", "approve"]:
            app["status"] = "approved"
        elif status_raw in ["rejected", "reject"]:
            app["status"] = "rejected"
        else:
            app["status"] = "pending"
        try:
            results.append(ApplicationResponse(**app))
        except Exception as e:
            print(f"[ApplicationResponse fallback note]: {e}")
            results.append(
                ApplicationResponse(
                    hackathonId=str(app.get("hackathonId", "")),
                    userId=current_user_id,
                    teamId=str(app.get("teamId", "")),
                    status=app.get("status", "pending"),
                    teamName=app.get("teamName"),
                    _id=str(app.get("_id", "")),
                    appliedAt=app.get("appliedAt", datetime.utcnow())
                )
            )

    return results


@router.get("/hackathon/{hackathon_id}", response_model=List[ApplicationResponse])
async def get_hackathon_applications(
    hackathon_id: str,
    current_user: dict = Depends(RequireRole(["organizer", "admin"])),
):
    """Get all applications for a hackathon (Organizer or Admin only)."""
    collection = get_application_collection()
    cursor = collection.find({"hackathonId": hackathon_id})
    apps = await cursor.to_list(1000)

    for app in apps:
        app["_id"] = str(app["_id"])

    return [ApplicationResponse(**app) for app in apps]
