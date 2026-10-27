from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    File,
    UploadFile,
    Form,
    Request,
    Body,
)
from bson import ObjectId as BsonId
from typing import List, Optional, Dict, Any
from database import get_db
from core.dependencies import with_auth
from core.security import get_current_user_optional
from schemas.hackathonSchema import HackathonCreate, HackathonUpdate, HackathonResponse
from services.hackathonService import HackathonService
from models.hackathonModel import HackathonStatus, HackathonTheme
from pydantic import ValidationError
import json
from datetime import datetime
import re
import urllib.parse


router = APIRouter()



@router.post(
    "/",
    response_model=HackathonResponse,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=False,
)
async def create_hackathon(
    request: Request,
    poster: Optional[UploadFile] = File(None),
    template: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """
    Create a new hackathon (Organizer only)

    This endpoint accepts BOTH:
    1. multipart/form-data with files + JSON string in 'data' field
    2. application/json with all data (no files)
    """

    # Check authorization (case-insensitive)
    user_role = str(current_user.get("role", "")).lower()
    requested_role = str(current_user.get("requested_role", "")).lower()
    if user_role not in ["organizer", "admin", "superadmin"] and requested_role not in ["organizer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can create hackathons",
        )

    db = get_db()
    organizer_id = str(
        current_user.get("_id")
        or current_user.get("sub")
        or current_user.get("id")
        or "org_default"
    )

    try:
        content_type = request.headers.get("content-type", "")

        # CASE 1: JSON request (no files)
        if "application/json" in content_type:
            body = await request.json()

            # Validate data using Pydantic
            validated_data = HackathonCreate.model_validate(body)

            # No files in this case
            poster_file = None
            template_file = None

        # CASE 2: Form-data request (with or without files)
        else:
            print("DEBUG: Handling as form-data request")
            if not data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing 'data' field in form-data",
                )

            # Parse JSON string
            try:
                json_data = json.loads(data)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid JSON in data field: {str(e)}",
                )

            # Validate using Pydantic (themes and other fields will be auto-converted by validators)
            validated_data = HackathonCreate.model_validate(json_data)

            # Use provided files
            poster_file = poster
            template_file = template

        # CREATE HACKATHON (common logic for both cases)
        hackathon = await HackathonService.create_hackathon(
            organizer_id=organizer_id,
            data=validated_data,
            db=db,
            poster=poster_file,
            template=template_file,
        )

        return hackathon

    except HTTPException:
        raise
    except ValidationError as val_err:
        err_msg = val_err.errors()[0]["msg"] if val_err.errors() else str(val_err)
        err_field = ".".join(str(loc) for loc in val_err.errors()[0].get("loc", [])) if val_err.errors() else ""
        detail_str = f"Validation failed for {err_field}: {err_msg}" if err_field else f"Validation failed: {err_msg}"
        print(f"VALIDATION ERROR: {detail_str}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail_str,
        )
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create hackathon: {str(e)}",
        )


@router.put("/{id}", response_model=HackathonResponse, response_model_by_alias=False)
async def update_hackathon(
    id: str,
    request: Request,
    poster: Optional[UploadFile] = File(None),
    template: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(with_auth),
):
    db = get_db()

    try:
        content_type = request.headers.get("content-type", "")

        # CASE 1: JSON request
        if "application/json" in content_type:
            body = await request.json()
            validated_data = HackathonUpdate.model_validate(body)
            poster_file = None
            template_file = None

        # CASE 2: Form-data request
        else:
            if not data:
                raise HTTPException(400, "Missing 'data' field")

            json_data = json.loads(data)
            validated_data = HackathonUpdate.model_validate(json_data)
            poster_file = poster
            template_file = template

        # Update hackathon
        updated = await HackathonService.update_hackathon(
            hid=id,
            organizer_id=current_user["sub"],
            user_role=current_user["role"],
            data=validated_data,
            db=db,
            poster=poster_file,
            template=template_file,
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Hackathon not found"
            )

        return updated

    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Update failed: {str(e)}")


@router.get(
    "",
    response_model=List[HackathonResponse],
    response_model_by_alias=False,
)
@router.get(
    "/",
    response_model=List[HackathonResponse],
    response_model_by_alias=False,
)
@router.get(
    "/allHackathons",
    response_model=List[HackathonResponse],
    response_model_by_alias=False,
)
async def get_all_hackathons(
    status: Optional[HackathonStatus] = None,
    theme: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    db = get_db()
    filters = {}
    if status:
        filters["status"] = status
    if theme:
        filters["themes"] = theme
    if search:
        filters["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    if not current_user or current_user["role"] in ["student", "mentor"]:
        filters["isPublic"] = True
        filters["status"] = {"$ne": HackathonStatus.DRAFT}

    return await HackathonService.get_all_hackathons(db, filters)


@router.get(
    "/myhackathons",
    response_model=List[HackathonResponse],
    response_model_by_alias=False,
)
@router.get(
    "/organizer/my",
    response_model=List[HackathonResponse],
    response_model_by_alias=False,
)
@router.get(
    "/my",
    response_model=List[HackathonResponse],
    response_model_by_alias=False,
)
async def get_my_hackathons(current_user: Dict[str, Any] = Depends(with_auth)):
    """Get hackathons created by the current organizer"""
    if current_user["role"] not in ["organizer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can access this endpoint",
        )

    db = get_db()
    return await HackathonService.get_organizer_hackathons(current_user["sub"], db)


@router.get("/{id}", response_model=HackathonResponse, response_model_by_alias=False)
async def get_hackathon(
    id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get a specific hackathon by ID or hackathonId"""
    id = id.strip("{}'\"")
    db = get_db()
    hackathon = await HackathonService.get_hackathon_by_id(id, db)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    if current_user.get("role") == "student" and (
        not hackathon.get("isPublic", True)
        or str(hackathon.get("status", "")).lower() == HackathonStatus.DRAFT.value.lower()
    ):
        raise HTTPException(status_code=404, detail="Hackathon not found")

    organizer_id = hackathon.get("organizerId")
    if organizer_id and BsonId.is_valid(str(organizer_id)):
        organizer = await db["users"].find_one(
            {"_id": BsonId(str(organizer_id))}, {"name": 1}
        )
        if organizer and organizer.get("name"):
            hackathon["organizerName"] = organizer["name"]

    return hackathon


@router.delete("/{id}")
async def delete_hackathon(id: str, current_user: Dict[str, Any] = Depends(with_auth)):
    """Delete a hackathon (Owner or Admin only)"""
    id = id.strip("{}'\"")
    if current_user["role"] not in ["organizer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    db = get_db()
    try:
        success = await HackathonService.delete_hackathon(
            id, current_user["sub"], current_user["role"], db
        )
        if not success:
            raise HTTPException(status_code=404, detail="Hackathon not found")
        return {"message": "Hackathon deleted successfully"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete hackathon: {str(e)}"
        )


# ─── Admin Hackathon Approval Endpoints ────────────────────────────────────────


@router.get("/admin/pending")
async def get_pending_hackathons(current_user: Dict[str, Any] = Depends(with_auth)):
    """Get all hackathons pending admin review (Draft or pending status)."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    hackathons_col = db["hackathons"]
    users_col = db["users"]

    cursor = hackathons_col.find(
        {"status": {"$in": ["Draft", "Pending", "Changes Requested"]}}
    ).sort("createdAt", -1)
    hackathons = await cursor.to_list(100)

    result = []
    for h in hackathons:
        organizer = (
            await users_col.find_one({"_id": ObjectId(h["organizerId"])})
            if ObjectId.is_valid(h.get("organizerId", ""))
            else None
        )
        org_name = organizer["name"] if organizer else "Unknown Organizer"

        result.append(
            {
                "id": str(h["_id"]),
                "title": h.get("title", "Untitled"),
                "status": h.get("status", "Draft"),
                "organizerName": org_name,
                "organizerAvatar": f"https://ui-avatars.com/api/?name={org_name.replace(' ', '+')}&background=3b82f6&color=fff",
                "submittedOn": (
                    h["createdAt"].strftime("%b %d, %Y")
                    if h.get("createdAt")
                    else "N/A"
                ),
                "lastUpdated": "Recently",
                "lastUpdatedBy": "System",
                "changeItems": h.get("changeItems", []),
                "timeline": h.get(
                    "timeline",
                    [
                        {
                            "id": 1,
                            "status": "Submission Received",
                            "timestamp": (
                                h["createdAt"].strftime("%b %d, %Y")
                                if h.get("createdAt")
                                else "N/A"
                            ),
                            "actor": None,
                            "type": "secondary",
                            "isActive": True,
                        }
                    ],
                ),
            }
        )

    return result


@router.post("/{hackathon_id}/approve")
async def approve_hackathon(
    hackathon_id: str, current_user: Dict[str, Any] = Depends(with_auth)
):
    """Approve a hackathon — set status to Live."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    from bson import ObjectId as BsonId

    result = await db["hackathons"].update_one(
        {"_id": BsonId(hackathon_id)}, {"$set": {"status": "Live"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return {"success": True, "message": "Hackathon approved and set to Live."}


@router.post("/{hackathon_id}/reject")
async def reject_hackathon(
    hackathon_id: str, current_user: Dict[str, Any] = Depends(with_auth)
):
    """Reject a hackathon."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    from bson import ObjectId as BsonId

    result = await db["hackathons"].update_one(
        {"_id": BsonId(hackathon_id)}, {"$set": {"status": "Rejected"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return {"success": True, "message": "Hackathon submission has been rejected."}


@router.post("/{hackathon_id}/message")
async def message_organizer(
    hackathon_id: str,
    body: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """Send a message to the hackathon organizer via the inbox."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    db = get_db()
    from bson import ObjectId as BsonId

    hackathon = await db["hackathons"].find_one({"_id": BsonId(hackathon_id)})
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    # Store in inbox collection
    await db["inbox"].insert_one(
        {
            "toUserId": hackathon["organizerId"],
            "fromUserId": current_user["sub"],
            "subject": f"Re: {hackathon.get('title', 'Your Hackathon')}",
            "body": message,
            "read": False,
            "createdAt": __import__("datetime").datetime.utcnow(),
        }
    )
    return {"success": True, "message": "Message sent to organizer successfully."}


@router.post("/{hackathon_id}/contact-admin")
async def contact_admin(
    hackathon_id: str,
    body: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """Allow an organizer to contact platform admins about a hackathon."""
    if current_user["role"] not in ["organizer", "admin"]:
        raise HTTPException(status_code=403, detail="Organizer access required")

    subject = body.get("subject", "").strip() or "Organizer Support Request"
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    db = get_db()
    from bson import ObjectId as BsonId

    if not BsonId.is_valid(hackathon_id):
        raise HTTPException(status_code=400, detail="Invalid hackathon id")

    hackathon = await db["hackathons"].find_one({"_id": BsonId(hackathon_id)})
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    if (
        current_user["role"] != "admin"
        and hackathon.get("organizerId") != current_user["sub"]
    ):
        raise HTTPException(status_code=403, detail="Not authorized for this hackathon")

    admins = (
        await db["users"].find({"role": {"$in": ["admin", "superadmin"]}}).to_list(100)
    )
    if not admins:
        await db["supportRequests"].insert_one(
            {
                "hackathonId": hackathon_id,
                "organizerId": current_user["sub"],
                "subject": subject,
                "message": message,
                "status": "open",
                "createdAt": datetime.utcnow(),
            }
        )
        return {"success": True, "message": "Support request saved for admin review."}

    notifications = [
        {
            "userId": str(admin["_id"]),
            "hackathonId": hackathon_id,
            "type": "system_alert",
            "message": f"{subject} - {hackathon.get('title', 'Hackathon')}: {message}",
            "read": False,
            "createdAt": datetime.utcnow(),
        }
        for admin in admins
    ]
    await db["notifications"].insert_many(notifications)

    return {"success": True, "message": "Message sent to platform admins."}


@router.get("/{id}/timeline")
async def get_hackathon_timeline(
    id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Get hackathon timeline phases"""
    db = get_db()
    from bson import ObjectId as BsonId

    clean_id = str(id).strip("{}'\" ")
    unquoted = urllib.parse.unquote(clean_id).strip()

    hackathon = None
    if BsonId.is_valid(clean_id):
        hackathon = await db["hackathons"].find_one({"_id": BsonId(clean_id)})

    if not hackathon:
        hackathon = await db["hackathons"].find_one({
            "$or": [
                {"_id": clean_id},
                {"id": clean_id},
                {"title": clean_id},
                {"title": unquoted},
                {"title": {"$regex": f"^{re.escape(clean_id)}$", "$options": "i"}},
                {"title": {"$regex": f"^{re.escape(unquoted)}$", "$options": "i"}}
            ]
        })

    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    timeline_data = hackathon.get("timeline")
    if isinstance(timeline_data, dict):
        phases = timeline_data.get("phases", [])
    elif isinstance(timeline_data, list):
        phases = timeline_data
    else:
        phases = [
            {
                "id": "p1",
                "name": "Registration",
                "status": "In Progress",
                "date": "Active Phase",
                "description": "Team registration and participant onboarding.",
            },
            {
                "id": "p2",
                "name": "Hacking & Development",
                "status": "Upcoming",
                "date": "Sprint Phase",
                "description": "Core development and project builds.",
            },
            {
                "id": "p3",
                "name": "Submission Deadline",
                "status": "Upcoming",
                "date": "Deliverable Intake",
                "description": "Final project repositories and demos.",
            },
            {
                "id": "p4",
                "name": "Evaluation & Judging",
                "status": "Upcoming",
                "date": "Review Stage",
                "description": "Panel evaluations and scorecards.",
            },
            {
                "id": "p5",
                "name": "Results & Awards",
                "status": "Upcoming",
                "date": "Ceremony",
                "description": "Final leaderboard and credential issuance.",
            },
        ]

    return {"id": str(hackathon.get("_id", clean_id)), "phases": phases}


@router.put("/{id}/timeline")
async def update_hackathon_timeline(
    id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """Update hackathon timeline phases"""
    db = get_db()
    from bson import ObjectId as BsonId

    clean_id = str(id).strip("{}'\" ")
    unquoted = urllib.parse.unquote(clean_id).strip()

    existing = None
    if BsonId.is_valid(clean_id):
        existing = await db["hackathons"].find_one({"_id": BsonId(clean_id)})

    if not existing:
        existing = await db["hackathons"].find_one({
            "$or": [
                {"_id": clean_id},
                {"id": clean_id},
                {"title": clean_id},
                {"title": unquoted},
                {"title": {"$regex": f"^{re.escape(clean_id)}$", "$options": "i"}},
                {"title": {"$regex": f"^{re.escape(unquoted)}$", "$options": "i"}}
            ]
        })

    if not existing:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    phases = payload.get("phases", payload.get("timeline", []))

    await db["hackathons"].update_one(
        {"_id": existing["_id"]},
        {"$set": {"timeline": phases, "updatedAt": datetime.utcnow()}}
    )

    return {
        "success": True,
        "message": "Timeline updated successfully",
        "phases": phases,
    }
