from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import RequireRole, with_auth
from database import get_db
from schemas.progress import (
    TeamProgressResponse,
    TeamProgressUpdate,
    ProgressStatus,
    MilestoneProgressResponse,
    MilestoneProgressCreate,
    MilestoneProgressUpdate,
)
from models.progress import TeamProgressInDB, MilestoneProgressInDB

router = APIRouter()


def get_progress_collection():
    return get_db()["progress"]


def get_milestone_progress_collection():
    return get_db()["milestoneProgress"]


async def _require_team_member(team_id: str, current_user: dict, allow_workspace_collaborator: bool = False):
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID")
    db = get_db()
    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    user_id = str(current_user.get("id") or current_user.get("sub") or "")
    membership = await db["teamMembers"].find_one({"teamId": team_id, "userId": user_id})
    can_collaborate = current_user.get("role") == "admin"
    if allow_workspace_collaborator and not can_collaborate:
        can_collaborate = str(team.get("mentorId") or "") == user_id
        hackathon_id = str(team.get("hackathonId") or "")
        if not can_collaborate and current_user.get("role") == "organizer" and hackathon_id:
            query = {"_id": ObjectId(hackathon_id)} if ObjectId.is_valid(hackathon_id) else {"_id": hackathon_id}
            hackathon = await db["hackathons"].find_one(query)
            can_collaborate = bool(hackathon and str(hackathon.get("organizerId") or "") == user_id)
    if not membership and not can_collaborate:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this team")
    return db, team, user_id


async def _record_activity(db, team_id: str, actor_id: str, action: str, item: str, event_type: str):
    actor_name = "Team member"
    if ObjectId.is_valid(actor_id):
        user = await db["users"].find_one({"_id": ObjectId(actor_id)}, {"name": 1})
        if user and user.get("name"):
            actor_name = user["name"]
    await db["teamActivity"].insert_one({
        "teamId": team_id,
        "actorId": actor_id,
        "actorName": actor_name,
        "action": action,
        "item": item,
        "eventType": event_type,
        "createdAt": datetime.utcnow(),
    })


@router.get("/team/{team_id}", response_model=TeamProgressResponse)
async def get_team_progress(team_id: str, current_user: dict = Depends(with_auth)):
    """Get progress tracking for a specific team"""
    db, team, _ = await _require_team_member(team_id, current_user, allow_workspace_collaborator=True)
    progress_collection = get_progress_collection()

    # Get progress
    progress = await progress_collection.find_one({"teamId": team_id})
    if not progress:
        # For initialization, we need hackathonId. Let's find the team.
        # Get first stage of hackathon if possible
        hackathons_collection = db["hackathons"]
        hackathon = await hackathons_collection.find_one(
            {"_id": ObjectId(team["hackathonId"])}
        )

        # Get stages
        stages_collection = db["stages"]
        stages = (
            await stages_collection.find({"hackathonId": team["hackathonId"]})
            .sort("stageOrder", 1)
            .to_list(1)
        )
        first_stage_id = str(stages[0]["_id"]) if stages else "initial"

        progress_data = {
            "hackathonId": team["hackathonId"],
            "teamId": team_id,
            "currentStageId": first_stage_id,
            "status": ProgressStatus.NOT_STARTED.value,
            "lastUpdated": datetime.utcnow(),
        }

        result = await progress_collection.insert_one(progress_data)
        progress_data["_id"] = str(result.inserted_id)
        progress = progress_data

    progress["_id"] = str(progress["_id"])
    return TeamProgressResponse(**progress)


@router.put("/team/{team_id}", response_model=TeamProgressResponse)
async def update_team_progress(
    team_id: str,
    update_data: TeamProgressUpdate,
    current_user: dict = Depends(with_auth),
):
    """Update team progress status"""
    await _require_team_member(team_id, current_user, allow_workspace_collaborator=True)
    progress_collection = get_progress_collection()

    progress = await progress_collection.find_one({"teamId": team_id})
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Progress record not found"
        )

    update_dict = update_data.model_dump(exclude_unset=True, by_alias=True)
    update_dict["lastUpdated"] = datetime.utcnow()

    await progress_collection.update_one({"teamId": team_id}, {"$set": update_dict})

    updated_progress = await progress_collection.find_one({"teamId": team_id})
    updated_progress["_id"] = str(updated_progress["_id"])

    return TeamProgressResponse(**updated_progress)


@router.post("/milestone", response_model=MilestoneProgressResponse)
async def create_milestone_progress(
    milestone_data: MilestoneProgressCreate, current_user: dict = Depends(RequireRole(["student"]))
):
    """Create or update a team's persisted milestone/task."""
    if not ObjectId.is_valid(milestone_data.progressId):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid progress ID")
    db = get_db()
    progress = await db["progress"].find_one({"_id": ObjectId(milestone_data.progressId)})
    if not progress:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team progress not found")
    team_id = str(progress.get("teamId") or "")
    _, _, user_id = await _require_team_member(team_id, current_user)
    collection = get_milestone_progress_collection()

    # Check if already exists
    existing = await collection.find_one(
        {
            "progressId": milestone_data.progressId,
            "milestoneId": milestone_data.milestoneId,
        }
    )

    if existing:
        # Update existing
        update_dict = milestone_data.model_dump(by_alias=True, exclude_none=True)
        changed = existing.get("completed") != milestone_data.completed
        update_dict["updatedAt"] = datetime.utcnow()
        update_dict["updatedBy"] = user_id
        if milestone_data.completed:
            update_dict["verifiedAt"] = datetime.utcnow()
            update_dict["verifiedBy"] = user_id
        else:
            update_dict["verifiedAt"] = None
            update_dict["verifiedBy"] = None

        await collection.update_one({"_id": existing["_id"]}, {"$set": update_dict})
        existing.update(update_dict)
        if changed:
            await _record_activity(db, team_id, user_id, "updated task status", milestone_data.title or milestone_data.milestoneId, "task_updated")
        existing["_id"] = str(existing["_id"])
        return MilestoneProgressResponse(**existing)

    # Create new
    doc = milestone_data.model_dump(by_alias=True, exclude_none=True)
    doc.update({"createdBy": user_id, "createdAt": datetime.utcnow(), "updatedBy": user_id, "updatedAt": datetime.utcnow()})
    if milestone_data.completed:
        doc["verifiedAt"] = datetime.utcnow()
        doc["verifiedBy"] = user_id

    result = await collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    await _record_activity(db, team_id, user_id, "created task", milestone_data.title or milestone_data.milestoneId, "task_created")

    return MilestoneProgressResponse(**doc)


@router.get("/milestones/{progress_id}", response_model=List[MilestoneProgressResponse])
async def get_milestones_progress(progress_id: str, current_user: dict = Depends(with_auth)):
    """Get all milestone progress for a team's progress record"""
    if not ObjectId.is_valid(progress_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid progress ID")
    progress = await get_progress_collection().find_one({"_id": ObjectId(progress_id)})
    if not progress:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team progress not found")
    await _require_team_member(str(progress.get("teamId") or ""), current_user, allow_workspace_collaborator=True)
    collection = get_milestone_progress_collection()
    cursor = collection.find({"progressId": progress_id})
    docs = await cursor.to_list(100)

    for doc in docs:
        doc["_id"] = str(doc["_id"])

    return [MilestoneProgressResponse(**doc) for doc in docs]


@router.put("/milestone/{milestone_id}", response_model=MilestoneProgressResponse)
@router.put("/milestones/{milestone_id}", response_model=MilestoneProgressResponse)
async def update_milestone_progress(
    milestone_id: str,
    update_data: MilestoneProgressUpdate,
    current_user: dict = Depends(with_auth),
):
    if not ObjectId.is_valid(milestone_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db = get_db()
    collection = get_milestone_progress_collection()
    milestone = await collection.find_one({"_id": ObjectId(milestone_id)})
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    progress = await db["progress"].find_one({"_id": ObjectId(milestone["progressId"])})
    if not progress:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team progress not found")
    team_id = str(progress.get("teamId") or "")
    _, _, user_id = await _require_team_member(team_id, current_user, allow_workspace_collaborator=True)
    if current_user.get("role") not in {"student", "mentor", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot update tasks for this team")
    changed = milestone.get("completed", False) != update_data.completed
    now = datetime.utcnow()
    update = {"completed": update_data.completed, "updatedAt": now, "updatedBy": user_id}
    if update_data.completed:
        update.update({"verifiedAt": now, "verifiedBy": user_id})
    else:
        update.update({"verifiedAt": None, "verifiedBy": None})
    await collection.update_one({"_id": ObjectId(milestone_id)}, {"$set": update})
    milestone.update(update)
    if changed:
        await _record_activity(db, team_id, user_id, "marked task complete" if update_data.completed else "reopened task", milestone.get("title") or milestone.get("milestoneId", "Task"), "task_updated")
    milestone["_id"] = str(milestone["_id"])
    return MilestoneProgressResponse(**milestone)


@router.get("/activity/team/{team_id}", response_model=List[Dict[str, Any]])
async def get_team_activity(team_id: str, current_user: dict = Depends(with_auth)):
    """Return real team events from persisted task, member, file, and submission records."""
    db, _, _ = await _require_team_member(team_id, current_user, allow_workspace_collaborator=True)
    events = []

    async def add_event(event_id, created_at, actor, action, item):
        if not isinstance(created_at, datetime):
            return
        events.append({
            "id": str(event_id),
            "createdAt": created_at,
            "user": actor or "Team member",
            "action": action,
            "item": item or "",
        })

    for doc in await db["teamActivity"].find({"teamId": team_id}).to_list(200):
        await add_event(doc.get("_id"), doc.get("createdAt"), doc.get("actorName"), doc.get("action", "updated the workspace"), doc.get("item"))

    team_progress = await db["progress"].find({"teamId": team_id}).to_list(20)
    for progress in team_progress:
        progress_id = str(progress.get("_id") or "")
        milestones = await db["milestoneProgress"].find({"progressId": progress_id}).to_list(200)
        for milestone in milestones:
            verified_at = milestone.get("verifiedAt")
            if not verified_at or milestone.get("updatedAt"):
                continue
            actor_id = str(milestone.get("verifiedBy") or "")
            actor = None
            if ObjectId.is_valid(actor_id):
                user = await db["users"].find_one({"_id": ObjectId(actor_id)}, {"name": 1})
                actor = (user or {}).get("name")
            await add_event(
                f"milestone-{milestone.get('_id')}", verified_at, actor,
                "completed a milestone", milestone.get("title") or milestone.get("milestoneId"),
            )

    for doc in await db["teamMembers"].find({"teamId": team_id}).to_list(200):
        joined_at = doc.get("joinedAt")
        user_id = str(doc.get("userId") or "")
        user = await db["users"].find_one({"_id": ObjectId(user_id)}, {"name": 1}) if ObjectId.is_valid(user_id) else None
        await add_event(f"member-{doc.get('_id', user_id)}", joined_at, (user or {}).get("name"), "joined the team", "")

    for doc in await db["teamFiles"].find({"teamId": team_id}).to_list(500):
        await add_event(doc.get("_id"), doc.get("uploadedAt"), doc.get("uploadedBy"), "shared a file", doc.get("fileName"))

    for doc in await db["submissions"].find({"teamId": team_id}).to_list(200):
        await add_event(doc.get("_id"), doc.get("submittedAt"), doc.get("submittedByName") or "Team", "submitted a project", doc.get("project"))

    events.sort(key=lambda item: item["createdAt"].timestamp(), reverse=True)
    return events[:100]
