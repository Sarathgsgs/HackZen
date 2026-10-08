from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth
from database import get_db
from schemas.submission import SubmissionCreate, SubmissionResponse
from models.submission import SubmissionInDB

router = APIRouter()


def get_submission_collection():
    return get_db()["submissions"]


@router.post(
    "/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED
)
async def create_submission(
    sub_data: SubmissionCreate, current_user: dict = Depends(with_auth)
):
    """Submit project for a hackathon stage"""
    # Authorization: User must be in the team
    members_collection = get_db()["teamMembers"]
    is_member = await members_collection.find_one(
        {"teamId": sub_data.teamId, "userId": current_user["sub"]}
    )

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can submit projects",
        )

    collection = get_submission_collection()

    existing_submission = await collection.find_one(
        {"teamId": sub_data.teamId, "stageId": sub_data.stageId}
    )
    if existing_submission:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A submission already exists for this team and stage. Existing submission must be updated through the status workflow instead of creating a duplicate version.",
        )

    # Get current version for this team/stage
    current_version = await collection.count_documents(
        {"teamId": sub_data.teamId, "stageId": sub_data.stageId}
    )

    sub_dict = sub_data.model_dump(by_alias=True)
    sub_dict["version"] = current_version + 1
    sub_dict["submittedAt"] = datetime.utcnow()

    result = await collection.insert_one(sub_dict)
    sub_dict["_id"] = str(result.inserted_id)

    return SubmissionResponse(**sub_dict)


@router.get("/team/{team_id}", response_model=List[SubmissionResponse])
async def get_team_submissions(
    team_id: str, current_user: dict = Depends(with_auth)
):
    """Get all submissions for a specific team, limited to team members/admins."""
    members_collection = get_db()["teamMembers"]
    is_member = await members_collection.find_one(
        {"teamId": team_id, "userId": current_user["sub"]}
    )

    if not is_member and current_user.get("role") not in ["admin", "organizer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team",
        )

    collection = get_submission_collection()
    cursor = collection.find({"teamId": team_id}).sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    for sub in subs:
        sub["_id"] = str(sub["_id"])

    return [SubmissionResponse(**sub) for sub in subs]


@router.get("/", response_model=List[SubmissionResponse])
async def get_all_submissions(current_user: dict = Depends(with_auth)):
    """Get all submissions (Organizer/Admin only)"""
    if current_user.get("role") not in ["organizer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    collection = get_submission_collection()
    cursor = collection.find().sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    for sub in subs:
        sub["_id"] = str(sub["_id"])

    return [SubmissionResponse(**sub) for sub in subs]


@router.get("/admin/all")
async def get_admin_submissions(current_user: dict = Depends(with_auth)):
    """Fetch all submissions with resolved team and hackathon titles for admin view"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    submissions_collection = db["submissions"]
    teams_collection = db["teams"]
    hackathons_collection = db["hackathons"]

    cursor = submissions_collection.find().sort("submittedAt", -1)
    subs = await cursor.to_list(100)

    # Seed mock if empty
    if not subs:
        mock_subs = [
            {
                "teamId": "team_1",
                "stageId": "stage_1",
                "fileUrl": "#",
                "project": "AI Health Assistant",
                "desc": "Predictive analytics for personal wellness.",
                "category": "Healthcare",
                "status": "Pending",
                "version": 1,
                "submittedAt": datetime.utcnow(),
            }
        ]
        await submissions_collection.insert_many(mock_subs)
        subs = await submissions_collection.find().to_list(100)

    result = []
    for sub in subs:
        team = (
            await teams_collection.find_one({"_id": ObjectId(sub["teamId"])})
            if ObjectId.is_valid(sub["teamId"])
            else None
        )
        hackathon = None
        if team:
            hackathon = await hackathons_collection.find_one(
                {"_id": ObjectId(team["hackathonId"])}
            )

        sub_id = str(sub["_id"])
        formatted_sub = {
            "id": sub_id,
            "project": sub.get("project", "Untitled Project"),
            "desc": sub.get("desc", "No description"),
            "team": {
                "name": team["teamName"] if team else "CyberKnights",
                "avatar": f"https://ui-avatars.com/api/?name={team['teamName'].replace(' ', '+') if team else 'Team'}&background=random",
            },
            "hackathon": hackathon["title"] if hackathon else "Global Hackathon",
            "docs": [{"type": "Submission File", "icon": "📄"}],
            "date": sub["submittedAt"].strftime("%b %d, %Y"),
            "timestamp": int(sub["submittedAt"].timestamp() * 1000),
            "status": sub.get("status", "Pending"),
            "category": sub.get("category", "Healthcare"),
        }
        result.append(formatted_sub)

    return result


@router.put("/{submission_id}/status")
async def update_sub_status(
    submission_id: str,
    status_update: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Update submission status (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")

    collection = get_submission_collection()
    result = await collection.update_one(
        {"_id": ObjectId(submission_id)}, {"$set": {"status": new_status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")

    return {"success": True}
