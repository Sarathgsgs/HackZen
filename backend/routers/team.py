from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timedelta

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.team import (
    TeamCreate,
    TeamUpdate,
    TeamMemberRole,
    TeamResponse,
    TeamMemberResponse,
    TeamMentorUpdate,
)
from models.team import TeamInDB, TeamMemberInDB
from schemas.application import ApplicationStatus
from core.security import generate_team_invite_code, get_current_user_optional


router = APIRouter()


def get_team_collection():
    return get_db()["teams"]


def get_team_members_collection():
    return get_db()["teamMembers"]


def _authenticated_user_id(current_user: dict) -> str:
    user_id = current_user.get("id") or current_user.get("sub") or current_user.get("_id")
    return str(user_id) if user_id else ""


def _require_student(current_user: dict) -> str:
    if current_user.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can join a team.")
    user_id = _authenticated_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated student identity is missing.")
    return user_id


def _team_size_limit(hackathon: Optional[dict]) -> int:
    try:
        return max(1, int((hackathon or {}).get("maxTeamSize", 4)))
    except (TypeError, ValueError):
        return 4


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate, current_user: dict = Depends(RequireRole(["student"]))
):
    """Create a new team for a hackathon. hackathonId must be the MongoDB _id of the hackathon."""
    db = get_db()
    teams_collection = db["teams"]
    user_id = _authenticated_user_id(current_user)

    # 0. Validate hackathonId is a valid MongoDB ObjectId and hackathon exists
    if not ObjectId.is_valid(team_data.hackathonId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid hackathonId format. Must be a valid MongoDB ObjectId (the _id of the hackathon).",
        )

    hackathon = await db["hackathons"].find_one(
        {"_id": ObjectId(team_data.hackathonId)}
    )
    if not hackathon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found. Make sure you are using the original MongoDB _id of the hackathon.",
        )

    # TODO: Re-enable enrollment check once application approval flow is built
    # app_collection = db["applications"]
    # enrollment = await app_collection.find_one({
    #     "hackathonId": team_data.hackathonId,
    #     "userId": user_id,
    #     "status": ApplicationStatus.APPROVED.value
    # })
    # if not enrollment:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="You must enroll in the hackathon first before creating a team"
    #     )

    # 2. Check if user is already in a team for this hackathon
    members_collection = get_team_members_collection()
    user_memberships = await members_collection.find({"userId": user_id}).to_list(100)
    user_team_ids = []
    for m in user_memberships:
        try:
            user_team_ids.append(ObjectId(m["teamId"]))
        except:
            continue

    existing_team = await teams_collection.find_one(
        {"_id": {"$in": user_team_ids}, "hackathonId": team_data.hackathonId}
    )

    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of a team in this hackathon",
        )

    # Check if team name already taken for this hackathon
    existing = await teams_collection.find_one(
        {"hackathonId": team_data.hackathonId, "teamName": team_data.teamName}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Team name already exists"
        )

    # Get user name for createdBy
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user_name = user.get("name", "") if user else ""

    team_dict = team_data.model_dump(by_alias=True)
    team_dict["createdBy"] = user_name
    team_dict["createdAt"] = datetime.utcnow()

    # Generate unique team code with retry (in case of collision)
    max_retries = 10
    for attempt in range(max_retries):
        team_dict["teamCode"] = generate_team_invite_code()
        try:
            result = await teams_collection.insert_one(team_dict)
            team_dict["_id"] = str(result.inserted_id)
            break
        except Exception as e:
            if "E11000" in str(e):
                if "teamName" in str(e):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A team with this name already exists in this hackathon",
                    )
                if "teamCode" in str(e) and attempt < max_retries - 1:
                    continue
            raise

    # Add creator as leader
    leader_member = {
        "teamId": team_dict["_id"],
        "userId": user_id,
        "role": TeamMemberRole.LEADER.value,
        "joinedAt": datetime.utcnow(),
    }
    await members_collection.insert_one(leader_member)

    # Create initial progress record
    progress_collection = db["progress"]
    stages_collection = db["stages"]
    stages = (
        await stages_collection.find({"hackathonId": team_data.hackathonId})
        .sort("stageOrder", 1)
        .to_list(1)
    )
    first_stage_id = str(stages[0]["_id"]) if stages else "initial"

    progress_data = {
        "hackathonId": team_data.hackathonId,
        "teamId": team_dict["_id"],
        "currentStageId": first_stage_id,
        "status": "not-started",
        "lastUpdated": datetime.utcnow(),
    }
    await progress_collection.insert_one(progress_data)

    return TeamResponse(**team_dict)


# ===== IMPORTANT: /my-teams MUST come BEFORE /{team_id} =====
# Otherwise FastAPI treats "my-teams" as a team_id parameter


@router.get("/my", response_model=List[TeamResponse])
@router.get("/my-teams", response_model=List[TeamResponse])
async def get_my_teams(current_user: dict = Depends(with_auth)):
    """Get all teams where the current user is a member"""
    user_id = _authenticated_user_id(current_user)
    user_email = current_user.get("email")
    members_collection = get_team_members_collection()

    user_query = [{"userId": user_id}]
    if user_email:
        user_query.append({"userEmail": user_email})
        user_query.append({"email": user_email})
    cursor = members_collection.find({"$or": user_query})
    memberships = await cursor.to_list(100)

    membership_by_id = {str(item.get("teamId")): item for item in memberships if item.get("teamId")}
    team_ids = [ObjectId(team_id) for team_id in membership_by_id if ObjectId.is_valid(team_id)]

    teams_collection = get_team_collection()
    team_conditions = []
    if team_ids:
        team_conditions.append({"_id": {"$in": team_ids}})
    if user_id:
        team_conditions.append({"createdBy": user_id})
        team_conditions.append({"leaderId": user_id})
        team_conditions.append({"members.userId": user_id})
    if user_email:
        team_conditions.append({"members.email": user_email})

    if not team_conditions:
        return []

    cursor = teams_collection.find({"$or": team_conditions})
    teams = await cursor.to_list(100)

    for team in teams:
        team["_id"] = str(team["_id"])
        membership = membership_by_id.get(team["_id"], {})
        role = membership.get("role")
        if not role:
            role = TeamMemberRole.LEADER.value if (team.get("leaderId") == user_id or team.get("createdBy") == user_id) else TeamMemberRole.MEMBER.value
        team["myRole"] = role
        if role != TeamMemberRole.LEADER.value:
            team["teamCode"] = None
        team["memberCount"] = len(team.get("members") or []) or await members_collection.count_documents({"teamId": team["_id"]}) or 1

        hackathon = None
        hackathon_id = team.get("hackathonId")
        if hackathon_id and ObjectId.is_valid(str(hackathon_id)):
            hackathon = await get_db()["hackathons"].find_one(
                {"_id": ObjectId(str(hackathon_id))}, {"title": 1, "maxTeamSize": 1}
            )
        if hackathon:
            team["hackathonName"] = hackathon.get("title")
            team["maxTeamSize"] = hackathon.get("maxTeamSize", 4)

    return [TeamResponse(**team) for team in teams]


@router.get("/my-mentor-requests", response_model=List[Dict[str, Any]])
async def get_my_mentor_requests(current_user: dict = Depends(with_auth)):
    """Return real mentor assignments for teams the authenticated student belongs to."""
    db = get_db()
    user_id = _authenticated_user_id(current_user)
    members_collection = get_team_members_collection()
    memberships = await members_collection.find(
        {"$or": [{"userId": user_id}, {"userId": str(user_id)}]}
    ).to_list(100)

    team_ids = []
    for membership in memberships:
        team_id = membership.get("teamId")
        if not team_id:
            continue
        if isinstance(team_id, ObjectId):
            team_ids.append(team_id)
            continue
        if isinstance(team_id, str) and ObjectId.is_valid(team_id):
            team_ids.append(ObjectId(team_id))

    if not team_ids:
        return []

    teams_collection = get_team_collection()
    teams = await teams_collection.find(
        {"_id": {"$in": team_ids}, "mentorId": {"$exists": True, "$ne": None}}
    ).to_list(100)

    response = []
    for team in teams:
        team_id = str(team.get("_id"))
        mentor_id = team.get("mentorId")
        mentor_name = None

        if mentor_id and ObjectId.is_valid(str(mentor_id)):
            mentor_user = await db.users.find_one({"_id": ObjectId(str(mentor_id))})
            if mentor_user:
                mentor_name = mentor_user.get("name")

        response.append(
            {
                "teamId": team_id,
                "teamName": team.get("teamName"),
                "mentorId": mentor_id,
                "mentorName": mentor_name,
                "status": "assigned",
                "requestedAt": team.get("mentorAssignedAt"),
                "focusArea": team.get("mentorRequest", {}).get("focusArea"),
                "guidanceRequest": team.get("mentorRequest", {}).get("guidanceRequest"),
                "preferredTimeWindow": team.get("mentorRequest", {}).get("preferredTimeWindow"),
            }
        )

    return response


@router.get("/mentor-teams", response_model=List[TeamResponse])
async def get_mentor_teams(
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Get all teams assigned to the current mentor"""
    user_id = _authenticated_user_id(current_user)
    teams_collection = get_team_collection()

    id_queries = [{"mentorId": user_id}, {"mentor_id": user_id}, {"mentor": user_id}]
    if ObjectId.is_valid(user_id):
        id_queries.append({"mentorId": ObjectId(user_id)})
        id_queries.append({"mentor_id": ObjectId(user_id)})

    cursor = teams_collection.find({"$or": id_queries})
    teams = await cursor.to_list(100)

    # If mentor has no explicitly assigned teams, auto-assign first available demo teams
    if not teams:
        all_teams = await teams_collection.find({}).limit(3).to_list(3)
        if all_teams:
            mentor_name = current_user.get("name") or "Mentor"
            for t in all_teams:
                await teams_collection.update_one(
                    {"_id": t["_id"]},
                    {"$set": {"mentorId": user_id, "mentorName": mentor_name}}
                )
            teams = await teams_collection.find({"$or": id_queries}).to_list(100)

    for team in teams:
        team["_id"] = str(team["_id"])
        team["teamCode"] = None

    return [TeamResponse(**team) for team in teams]


@router.get("/mentor/my", response_model=List[TeamResponse])
async def get_mentor_teams_list(
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Get all teams mentored by the current mentor"""
    user_id = _authenticated_user_id(current_user)
    teams_collection = get_team_collection()

    id_queries = [{"mentorId": user_id}, {"mentor_id": user_id}, {"mentor": user_id}]
    if ObjectId.is_valid(user_id):
        id_queries.append({"mentorId": ObjectId(user_id)})

    cursor = teams_collection.find({"$or": id_queries})
    teams = await cursor.to_list(100)

    for team in teams:
        team["_id"] = str(team["_id"])
        team["teamCode"] = None

    return [TeamResponse(**team) for team in teams]


@router.get("/discoverable")
async def get_discoverable_teams(
    current_user: dict = Depends(with_auth)
):
    """Get all teams available for mentorship."""
    db = get_db()
    user_id = _authenticated_user_id(current_user)
    teams_collection = db["teams"]

    cursor = teams_collection.find({
        "$or": [
            {"mentorId": None},
            {"mentorId": ""},
            {"mentorId": {"$exists": False}},
            {"status": "Looking for Mentor"},
        ]
    }).limit(50)
    teams = await cursor.to_list(50)

    if not teams:
        # Fallback to general teams not already assigned to this mentor
        teams = await teams_collection.find({"mentorId": {"$ne": user_id}}).limit(20).to_list(20)

    results = []
    for team in teams:
        team_id = str(team["_id"])
        members_count = await db["teamMembers"].count_documents({"teamId": team_id})
        hackathon_id = team.get("hackathonId")
        hackathon_title = team.get("hackathonTitle") or "Active Hackathon"
        if hackathon_id and ObjectId.is_valid(str(hackathon_id)):
            h = await db["hackathons"].find_one({"_id": ObjectId(str(hackathon_id))})
            if h:
                hackathon_title = h.get("title") or hackathon_title

        progress = await db["progress"].find_one({"teamId": team_id}) or {}

        results.append({
            "_id": team_id,
            "id": team_id,
            "teamName": team.get("teamName") or team.get("name", "Untitled Team"),
            "hackathonTitle": hackathon_title,
            "domain": team.get("domain") or team.get("track") or "Technology",
            "description": team.get("description") or team.get("project") or "This team is actively building a solution and looking for mentor guidance.",
            "requiredSkills": team.get("requiredSkills") or ["React", "Python", "FastAPI", "MongoDB"],
            "memberCount": members_count or team.get("memberCount") or 3,
            "maxSize": team.get("maxSize") or 4,
            "progress": int(progress.get("percentage") or progress.get("overallProgress") or 35),
            "status": team.get("status") or "Active",
            "requested": False,
        })
    return results


@router.post("/{team_id}/request-mentor")
async def request_mentor_team(
    team_id: str,
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Assign current mentor to mentor a specific team."""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team ID format")

    db = get_db()
    user_id = _authenticated_user_id(current_user)
    mentor_name = current_user.get("name") or "Mentor"

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    await db["teams"].update_one(
        {"_id": ObjectId(team_id)},
        {"$set": {
            "mentorId": user_id,
            "mentorName": mentor_name,
            "status": "Active",
            "updatedAt": datetime.utcnow()
        }}
    )

    await db["inbox"].insert_one({
        "teamId": team_id,
        "type": "mentor_joined",
        "title": "Mentor Assigned",
        "message": f"{mentor_name} has joined as your official mentor.",
        "createdAt": datetime.utcnow(),
        "read": False,
    })

    return {"success": True, "message": f"You are now mentoring {team.get('teamName', 'this team')}."}


@router.get("/mentor/requests")
@router.get("/mentor-requests")
async def get_mentor_requests(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Fetch mentorship requests directed to the mentor."""
    db = get_db()
    user_id = _authenticated_user_id(current_user)

    filter_query = {
        "$or": [
            {"mentorId": user_id},
            {"mentorId": None},
            {"mentorId": ""},
            {"mentorId": {"$exists": False}},
        ]
    }
    if ObjectId.is_valid(user_id):
        filter_query["$or"].append({"mentorId": ObjectId(user_id)})

    if status and status.lower() != "all":
        filter_query["status"] = {"$regex": f"^{status}$", "$options": "i"}

    cursor = db["mentorRequests"].find(filter_query).sort("createdAt", -1).limit(limit)
    requests = await cursor.to_list(limit)

    # If no requests exist yet, generate from unassigned/active teams
    if not requests:
        teams = await db["teams"].find({"status": "Active"}).limit(4).to_list(4)
        for t in teams:
            t_id = str(t["_id"])
            requests.append({
                "_id": ObjectId(),
                "teamId": t_id,
                "teamName": t.get("teamName", "Team"),
                "domain": t.get("domain") or t.get("track") or "General",
                "description": t.get("project") or "Seeking mentor guidance on architecture and system design.",
                "message": t.get("project") or "We would appreciate your mentorship on our project.",
                "status": "pending",
                "memberCount": 3,
                "requiredSkills": t.get("requiredSkills", ["React", "Python"]),
                "createdAt": datetime.utcnow() - timedelta(days=1),
            })

    output = []
    for req in requests:
        req_id = str(req.get("_id", ""))
        team_id = str(req.get("teamId", ""))
        team_name = req.get("teamName")
        if not team_name and team_id and ObjectId.is_valid(team_id):
            team_doc = await db["teams"].find_one({"_id": ObjectId(team_id)})
            if team_doc:
                team_name = team_doc.get("teamName") or team_doc.get("name")

        output.append({
            "_id": req_id,
            "id": req_id,
            "teamId": team_id,
            "teamName": team_name or "Assigned Team",
            "description": req.get("description") or req.get("message") or "",
            "message": req.get("message") or req.get("description") or "",
            "domain": req.get("domain") or "General",
            "memberCount": req.get("memberCount") or req.get("teamSize") or 3,
            "teamSize": req.get("memberCount") or req.get("teamSize") or 3,
            "status": req.get("status") or "pending",
            "requiredSkills": req.get("requiredSkills") or ["React", "AI", "Cloud"],
            "createdAt": req.get("createdAt") or datetime.utcnow(),
        })

    return output


@router.patch("/mentor/requests/{request_id}")
@router.patch("/mentor-requests/{request_id}")
async def update_mentor_request(
    request_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(RequireRole(["mentor", "admin"]))
):
    """Accept or decline a mentorship request."""
    db = get_db()
    user_id = _authenticated_user_id(current_user)
    mentor_name = current_user.get("name") or "Mentor"

    decision = str(payload.get("decision") or payload.get("status") or "").lower()
    new_status = "approved" if decision in {"approved", "accept", "accepted"} else "rejected"

    req = None
    if ObjectId.is_valid(request_id):
        req = await db["mentorRequests"].find_one({"_id": ObjectId(request_id)})

    if not req:
        if ObjectId.is_valid(request_id):
            team_doc = await db["teams"].find_one({"_id": ObjectId(request_id)})
            if team_doc:
                req = {"teamId": str(team_doc["_id"]), "teamName": team_doc.get("teamName")}

    if req and ObjectId.is_valid(request_id):
        await db["mentorRequests"].update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": new_status, "updatedAt": datetime.utcnow()}},
            upsert=True
        )

    if new_status == "approved" and req and req.get("teamId"):
        team_id = req["teamId"]
        if ObjectId.is_valid(team_id):
            await db["teams"].update_one(
                {"_id": ObjectId(team_id)},
                {"$set": {
                    "mentorId": user_id,
                    "mentorName": mentor_name,
                    "status": "Active",
                    "updatedAt": datetime.utcnow(),
                }}
            )

    return {
        "success": True,
        "message": f"Request has been successfully {new_status}.",
        "status": new_status,
    }


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str, current_user: dict = Depends(with_auth)):
    """Get team details by team ID"""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    collection = get_team_collection()
    team = await collection.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    user_id = _authenticated_user_id(current_user)
    team_id = str(team["_id"])
    membership = await get_team_members_collection().find_one({"teamId": team_id, "userId": user_id})
    is_assigned_mentor = str(team.get("mentorId") or "") == user_id
    hackathon = None
    hackathon_id = team.get("hackathonId")
    if hackathon_id and ObjectId.is_valid(str(hackathon_id)):
        hackathon = await get_db()["hackathons"].find_one({"_id": ObjectId(str(hackathon_id))}, {"organizerId": 1})
    is_hackathon_organizer = bool(
        current_user.get("role") == "organizer"
        and hackathon
        and str(hackathon.get("organizerId")) == user_id
    )
    if not membership and not is_assigned_mentor and not is_hackathon_organizer and current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view this team.")
    if not membership or membership.get("role") != TeamMemberRole.LEADER.value:
        team["teamCode"] = None
    team["_id"] = team_id
    team["myRole"] = membership.get("role") if membership else None
    return TeamResponse(**team)


@router.get("/lookup/{team_code}")
async def lookup_team_by_code(
    team_code: str, current_user: dict = Depends(RequireRole(["student"]))
):
    """Return the real team and roster so a student can review a code before joining."""
    current_user_id = _require_student(current_user)
    db = get_db()
    team = await db["teams"].find_one({"teamCode": team_code.strip().upper()})
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found with the provided code")

    team_id = str(team["_id"])
    memberships = await db["teamMembers"].find({"teamId": team_id}).to_list(100)
    roster = []
    for membership in memberships:
        user_id = membership.get("userId")
        user = None
        if user_id and ObjectId.is_valid(str(user_id)):
            user = await db["users"].find_one({"_id": ObjectId(str(user_id))}, {"name": 1})
        roster.append({"name": user.get("name") if user else "Team member", "role": membership.get("role", "member")})

    hackathon = None
    hackathon_id = team.get("hackathonId")
    if hackathon_id and ObjectId.is_valid(str(hackathon_id)):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(str(hackathon_id))}, {"maxTeamSize": 1})
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This team’s hackathon is no longer available.")
    max_size = _team_size_limit(hackathon)
    already_member = await db["teamMembers"].find_one(
        {"teamId": team_id, "userId": current_user_id}
    )
    user_memberships = await db["teamMembers"].find(
        {"userId": current_user_id}
    ).to_list(100)
    existing_team_ids = [
        ObjectId(str(item.get("teamId")))
        for item in user_memberships
        if item.get("teamId") and ObjectId.is_valid(str(item.get("teamId")))
    ]
    already_in_hackathon = bool(
        await db["teams"].find_one(
            {"_id": {"$in": existing_team_ids}, "hackathonId": hackathon_id}
        )
    ) if existing_team_ids else False
    is_open = len(memberships) < max_size
    return {
        "_id": team_id,
        "teamName": team.get("teamName"),
        "teamCode": team.get("teamCode"),
        "memberCount": len(memberships),
        "maxTeamSize": max_size,
        "members": roster,
        "isOpen": is_open,
        "alreadyMember": bool(already_member),
        "canJoin": is_open and not already_in_hackathon,
    }


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: str, current_user: dict = Depends(with_auth)
):
    """Return roster profile details only to an authenticated team member."""
    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    user_id = _authenticated_user_id(current_user)
    members_collection = get_team_members_collection()
    viewer_membership = await members_collection.find_one({"teamId": team_id, "userId": user_id})
    team = await get_team_collection().find_one({"_id": ObjectId(team_id)})
    is_assigned_mentor = bool(team and str(team.get("mentorId") or "") == user_id)
    hackathon = None
    hackathon_id = (team or {}).get("hackathonId")
    if hackathon_id and ObjectId.is_valid(str(hackathon_id)):
        hackathon = await get_db()["hackathons"].find_one({"_id": ObjectId(str(hackathon_id))}, {"organizerId": 1})
    is_hackathon_organizer = bool(
        current_user.get("role") == "organizer"
        and hackathon
        and str(hackathon.get("organizerId")) == user_id
    )
    if not viewer_membership and not is_assigned_mentor and not is_hackathon_organizer and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team.",
        )
    cursor = members_collection.find({"teamId": team_id})
    members = await cursor.to_list(100)

    for member in members:
        member_user_id = str(member.get("userId") or "")
        user = None
        if ObjectId.is_valid(member_user_id):
            user = await get_db()["users"].find_one(
                {"_id": ObjectId(member_user_id)}, {"name": 1, "email": 1}
            )
        student_profile = await get_db()["students"].find_one(
            {"userId": member_user_id}, {"department": 1}
        )
        member["name"] = (user or {}).get("name") or "Team member"
        member["email"] = (user or {}).get("email")
        member["department"] = (student_profile or {}).get("department")
        member["_id"] = str(member["_id"])

    return [TeamMemberResponse(**member) for member in members]


@router.post("/join/{team_id_or_code}", response_model=TeamMemberResponse)
async def join_team(team_id_or_code: str, current_user: dict = Depends(RequireRole(["student"]))):
    """Join an open team using the private team code shared by its leader."""
    user_id = _require_student(current_user)
    db = get_db()
    teams_collection = db["teams"]

    team = await teams_collection.find_one({"teamCode": team_id_or_code.strip().upper()})

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found with the provided code.",
        )

    hackathon_id = team["hackathonId"]

    # TODO: Re-enable enrollment check once application approval flow is built
    # app_collection = db["applications"]
    # enrollment = await app_collection.find_one({
    #     "hackathonId": hackathon_id,
    #     "userId": user_id,
    #     "status": ApplicationStatus.APPROVED.value
    # })
    # if not enrollment:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="You must enroll in the hackathon first before joining a team"
    #     )

    # 2. Check if user is already in a team for this hackathon
    members_collection = get_team_members_collection()
    user_memberships = await members_collection.find({"userId": user_id}).to_list(100)
    if await members_collection.find_one({"teamId": str(team["_id"]), "userId": user_id}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already a member of this team.")
    user_team_ids = []
    for m in user_memberships:
        try:
            user_team_ids.append(ObjectId(m["teamId"]))
        except:
            continue

    existing_team = await teams_collection.find_one(
        {"_id": {"$in": user_team_ids}, "hackathonId": hackathon_id}
    )

    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of a team in this hackathon",
        )

    # Check capacity using the hackathon's configured team size.
    current_members_count = await members_collection.count_documents(
        {"teamId": str(team["_id"])}
    )

    hackathon = None
    if ObjectId.is_valid(hackathon_id):
        hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
    if not hackathon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This team’s hackathon is no longer available.")

    max_size = _team_size_limit(hackathon)

    if current_members_count >= max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Team is already full"
        )

    new_member = {
        "teamId": str(team["_id"]),
        "userId": user_id,
        "role": TeamMemberRole.MEMBER.value,
        "joinedAt": datetime.utcnow(),
    }
    try:
        result = await members_collection.insert_one(new_member)
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already a member of this team.")
    new_member["_id"] = str(result.inserted_id)

    return TeamMemberResponse(**new_member)


@router.post("/{team_id}/assign-mentor", response_model=TeamResponse)
async def assign_mentor(
    team_id: str, mentor_data: TeamMentorUpdate, current_user: dict = Depends(RequireRole(["student"]))
):
    """Assign a mentor to a team (One mentor per team, Team Leader only)"""
    db = get_db()
    teams_collection = db["teams"]
    user_id = _require_student(current_user)

    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    team = await teams_collection.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # Check if team already has a mentor
    if team.get("mentorId"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team already has a mentor assigned",
        )

    # Check if current user is the team leader
    members_collection = db["teamMembers"]
    membership = await members_collection.find_one(
        {"teamId": team_id, "userId": user_id, "role": TeamMemberRole.LEADER.value}
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader can assign a mentor",
        )

    # Verify the mentor exists
    mentor = await db["mentors"].find_one({"userId": mentor_data.mentorId})
    if not mentor:
        try:
            mentor = await db["mentors"].find_one(
                {"_id": ObjectId(mentor_data.mentorId)}
            )
        except:
            pass

        if not mentor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mentor not found or is not available",
            )

    mentor_user_id = str(mentor["userId"])
    if str(mentor.get("availability") or "Available").lower() != "available":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This mentor is not currently available.")

    assigned_at = datetime.utcnow()
    request_details = {
        key: value.strip()
        for key, value in {
            "focusArea": mentor_data.focusArea,
            "guidanceRequest": mentor_data.guidanceRequest,
            "preferredTimeWindow": mentor_data.preferredTimeWindow,
        }.items()
        if isinstance(value, str) and value.strip()
    }
    # This endpoint assigns a mentor immediately; keep the submitted request details
    # with that assignment so the student status page reflects persisted data.
    update_result = await teams_collection.update_one(
        {
            "_id": ObjectId(team_id),
            "$or": [{"mentorId": {"$exists": False}}, {"mentorId": None}],
        },
        {"$set": {
            "mentorId": mentor_user_id,
            "mentorAssignedAt": assigned_at,
            "mentorAssignedBy": user_id,
            "mentorRequest": request_details,
        }},
    )
    if not getattr(update_result, "modified_count", 0):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This team already has a mentor assignment.")

    updated_team = await teams_collection.find_one({"_id": ObjectId(team_id)})
    updated_team["_id"] = str(updated_team["_id"])
    return TeamResponse(**updated_team)


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str, user_id: str, current_user: dict = Depends(with_auth)
):
    """Remove a member from the team (Team Leader only)"""
    db = get_db()
    current_user_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    # 1. Verify team exists
    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # 2. Verify current user is the team leader
    members_coll = db["teamMembers"]
    leader_membership = await members_coll.find_one(
        {
            "teamId": team_id,
            "userId": current_user_id,
            "role": TeamMemberRole.LEADER.value,
        }
    )

    if not leader_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader can remove members",
        )

    # 3. Cannot remove yourself (the leader) - must delete team instead
    if user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team leader cannot remove themselves. Delete the team instead.",
        )

    # 4. Remove the member
    result = await members_coll.delete_one({"teamId": team_id, "userId": user_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this team",
        )

    return None


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: str, current_user: dict = Depends(with_auth)):
    """Delete the entire team (Team Leader or Admin only)"""
    db = get_db()
    current_user_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID format"
        )

    team_oid = ObjectId(team_id)
    team = await db["teams"].find_one({"_id": team_oid})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )

    # 2. Check permissions (Leader or Admin)
    is_admin = current_user.get("role") == "admin"

    leader_membership = None
    if not is_admin:
        leader_membership = await db["teamMembers"].find_one(
            {
                "teamId": team_id,
                "userId": current_user_id,
                "role": TeamMemberRole.LEADER.value,
            }
        )

    if not is_admin and not leader_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader or an admin can delete the team",
        )

    # 3. Delete all team members
    await db["teamMembers"].delete_many({"teamId": team_id})

    # 4. Delete progress records
    await db["progress"].delete_many({"teamId": team_id})

    return None


@router.patch("/{team_id}/status")
@router.put("/{team_id}/status")
async def update_team_status(
    team_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Update team approval/registration status (Approved, Pending, Rejected).
    Updates organizer_teams_registry, main teams collection, and applications.
    """
    db = get_db()
    new_status = payload.get("status") or payload.get("newStatus")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")

    raw = str(new_status).strip().lower()
    if raw == "approved":
        formatted_status = "Approved"
    elif raw == "rejected":
        formatted_status = "Rejected"
    elif raw == "pending":
        formatted_status = "Pending"
    else:
        formatted_status = str(new_status).strip().capitalize()

    now = datetime.utcnow()

    # 1. Update in organizer_teams_registry
    await db["organizer_teams_registry"].update_many(
        {"$or": [{"id": team_id}, {"_id": team_id}, {"teamId": team_id}, {"name": team_id}]},
        {"$set": {"status": formatted_status, "updatedAt": now}}
    )

    # 2. Update in teams collection
    team_query = []
    if ObjectId.is_valid(team_id):
        team_query.append({"_id": ObjectId(team_id)})
    team_query.extend([
        {"id": team_id},
        {"teamId": team_id},
        {"name": team_id}
    ])
    await db["teams"].update_many(
        {"$or": team_query},
        {"$set": {"status": formatted_status, "updatedAt": now}}
    )

    # 3. Update any applications linked to this team
    await db["applications"].update_many(
        {"teamId": team_id},
        {"$set": {"status": formatted_status, "updatedAt": now}}
    )

    return {
        "success": True,
        "teamId": team_id,
        "status": formatted_status,
        "message": f"Team status successfully updated to {formatted_status}"
    }

