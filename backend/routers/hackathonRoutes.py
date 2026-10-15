from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    File,
    UploadFile,
    Form,
    Request,
)
from bson import ObjectId as BsonId
from typing import List, Optional, Dict, Any
from database import get_db
from core.dependencies import with_auth
from core.security import get_current_user_optional
from schemas.hackathonSchema import HackathonCreate, HackathonUpdate, HackathonResponse
from services.hackathonService import HackathonService
from models.hackathonModel import HackathonStatus, HackathonTheme
import json

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

    # Check authorization
    if current_user["role"] not in ["organizer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can create hackathons",
        )

    db = get_db()

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
            organizer_id=current_user["sub"],
            data=validated_data,
            db=db,
            poster=poster_file,
            template=template_file,
        )

        return hackathon

    except HTTPException:
        raise
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
async def get_hackathon(id: str, current_user: Dict[str, Any] = Depends(with_auth)):
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
