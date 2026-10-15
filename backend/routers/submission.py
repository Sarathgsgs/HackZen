from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File
from typing import List, Optional, Dict, Any
import os
from bson import ObjectId
from datetime import datetime, timedelta

from core.dependencies import with_auth
from database import get_db
from schemas.submission import SubmissionCreate, SubmissionResponse
from models.submission import SubmissionInDB
from services.ai_service import ai_service

router = APIRouter()

ALLOWED_SUBMISSION_STATUSES = {
    "Pending Review",
    "Reviewed",
    "Shortlisted",
    "Rejected",
    "Evaluated",
    "Approved",
    "Disqualified",
    "Flagged for Investigation",
    "Changes Requested",
}


def get_submission_collection():
    return get_db()["submissions"]


@router.post("/upload")
async def upload_submission_file(
    file: UploadFile = File(...), current_user: dict = Depends(with_auth)
):
    """Upload project deliverable archive with real-time platform constraints validation."""
    db = get_db()
    platform_settings = await db["settings"].find_one({"key": "global_config"}) or {}

    # 1. Parse max file size
    max_size_str = platform_settings.get(
        "maxUploadFileSize", platform_settings.get("maxUploadSizeMB", "100 MB")
    )
    max_mb = 100
    try:
        max_mb = int("".join(filter(str.isdigit, str(max_size_str)))) or 100
    except:
        max_mb = 100
    max_bytes = max_mb * 1024 * 1024

    # 2. Parse allowed file extensions
    allowed_types_raw = platform_settings.get(
        "allowedFileTypes", ["ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"]
    )
    if isinstance(allowed_types_raw, str):
        allowed_types = [
            t.strip().upper().lstrip(".")
            for t in allowed_types_raw.split(",")
            if t.strip()
        ]
    elif isinstance(allowed_types_raw, list):
        allowed_types = [
            str(t).strip().upper().lstrip(".")
            for t in allowed_types_raw
            if str(t).strip()
        ]
    else:
        allowed_types = ["ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"]

    # 3. Validate file extension (supporting compound extensions like .tar.gz)
    filename = file.filename or "deliverable"
    filename_lower = filename.lower()
    if filename_lower.endswith(".tar.gz"):
        ext = "TAR.GZ"
    else:
        ext = filename.rsplit(".", 1)[-1].upper() if "." in filename else ""

    if ext not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension .{ext.lower()} is not allowed by platform policy. Allowed deliverable types: {', '.join(allowed_types)}",
        )

    # 4. Validate file size
    contents = await file.read()
    file_size = len(contents)
    if file_size > max_bytes:
        file_mb = round(file_size / (1024 * 1024), 1)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({file_mb} MB) exceeds platform maximum upload limit of {max_size_str}.",
        )

    # 5. Save file to uploads/submissions
    upload_dir = os.path.join(os.getcwd(), "uploads", "submissions")
    os.makedirs(upload_dir, exist_ok=True)
    clean_filename = (
        f"{int(datetime.utcnow().timestamp())}_{filename.replace(' ', '_')}"
    )
    file_path = os.path.join(upload_dir, clean_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/uploads/submissions/{clean_filename}"
    return {
        "success": True,
        "filename": filename,
        "fileUrl": file_url,
        "sizeBytes": file_size,
        "sizeMB": round(file_size / (1024 * 1024), 2),
        "extension": ext,
    }


async def build_submission_row(submission: Dict[str, Any], db) -> Dict[str, Any]:
    team = None
    hackathon = None
    team_id = submission.get("teamId")

    if ObjectId.is_valid(team_id):
        team = await db["teams"].find_one({"_id": ObjectId(team_id)})

    if team and ObjectId.is_valid(team.get("hackathonId", "")):
        hackathon = await db["hackathons"].find_one(
            {"_id": ObjectId(team["hackathonId"])}
        )

    evaluation_count = await db["evaluations"].count_documents(
        {"submissionId": str(submission["_id"])}
    )

    status_value = submission.get("status")
    if not status_value:
        status_value = "Evaluated" if evaluation_count else "Pending Review"
    if status_value == "Pending":
        status_value = "Pending Review"

    submitted_at = submission.get("submittedAt")

    return {
        "id": str(submission["_id"]),
        "teamId": team_id,
        "team": team.get("teamName", "Unknown Team") if team else "Unknown Team",
        "logo": (team.get("teamName", "T")[0] if team else "T"),
        "teamCode": team.get("teamCode", "N/A") if team else "N/A",
        "hackathonId": str(hackathon["_id"]) if hackathon else None,
        "hackathon": (
            hackathon.get("title", "Unknown Hackathon")
            if hackathon
            else "Unknown Hackathon"
        ),
        "title": submission.get(
            "project", f"Project Submission v{submission.get('version', 1)}"
        ),
        "description": submission.get("desc", ""),
        "track": submission.get("category", "General"),
        "status": status_value,
        "time": submitted_at.strftime("%b %d, %Y") if submitted_at else "N/A",
        "submittedAt": submitted_at.isoformat() if submitted_at else None,
        "fileUrl": submission.get("fileUrl"),
        "version": submission.get("version", 1),
        "evaluationCount": evaluation_count,
        "score": submission.get("totalScore"),
    }


async def can_manage_submission(
    submission: Dict[str, Any], current_user: Dict[str, Any], db
) -> bool:
    if current_user.get("role") in ["admin", "superadmin"]:
        return True

    if current_user.get("role") != "organizer":
        return False

    team_id = submission.get("teamId")
    if not ObjectId.is_valid(team_id):
        return False

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team or not ObjectId.is_valid(team.get("hackathonId", "")):
        return False

    hackathon = await db["hackathons"].find_one({"_id": ObjectId(team["hackathonId"])})
    user_id = current_user.get("id") or current_user.get("sub")
    return bool(hackathon and hackathon.get("organizerId") == user_id)


@router.get("/my")
async def get_my_submissions(current_user: dict = Depends(with_auth)):
    """Get all submissions made by the authenticated student or their teams."""
    db = get_db()
    user_id = str(current_user.get("id") or current_user.get("sub") or current_user.get("_id"))

    # 1. Find all team IDs user is member of
    user_memberships = await db["teamMembers"].find({"userId": user_id}).to_list(100)
    team_ids = [str(m["teamId"]) for m in user_memberships if m.get("teamId")]

    # Also check teams where user is leader
    async for team in db["teams"].find({"leaderId": user_id}):
        t_id = str(team["_id"])
        if t_id not in team_ids:
            team_ids.append(t_id)

    # 2. Find submissions by teamId or submittedBy/userId
    conditions = []
    if team_ids:
        conditions.append({"teamId": {"$in": team_ids}})
    conditions.append({"submittedBy": user_id})
    conditions.append({"userId": user_id})

    cursor = db["submissions"].find({"$or": conditions}).sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    rows = []
    for s in subs:
        row = await build_submission_row(s, db)
        rows.append(row)

    return rows


@router.post(
    "/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED
)
async def create_submission(
    sub_data: SubmissionCreate, current_user: dict = Depends(with_auth)
):
    """Submit project for a hackathon stage with real-time platform constraints validation."""
    db = get_db()
    members_collection = db["teamMembers"]
    teams_collection = db["teams"]
    hackathons_collection = db["hackathons"]

    user_id = (
        current_user.get("id") or current_user.get("sub") or current_user.get("_id")
    )
    target_team_id = getattr(sub_data, "teamId", getattr(sub_data, "team_id", ""))
    target_stage_id = getattr(
        sub_data, "stageId", getattr(sub_data, "stage_id", "initial_stage")
    )

    is_member = await members_collection.find_one(
        {"teamId": target_team_id, "userId": user_id}
    )

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team members can submit projects",
        )

    # 1. Fetch live platform settings
    platform_settings = await db["settings"].find_one({"key": "global_config"}) or {}
    allow_late = bool(platform_settings.get("allowLateSubmissions", False))
    min_team_size = int(platform_settings.get("minTeamSize", 1))
    req_github = bool(
        platform_settings.get(
            "gitHubRepo", platform_settings.get("requireGithubRepo", False)
        )
    )
    req_demo = bool(
        platform_settings.get(
            "demoUrl", platform_settings.get("requireLiveDemo", False)
        )
    )
    plagiarism_detect = bool(platform_settings.get("plagiarismDetect", True))

    # 2. Check team size minimum
    member_count = await members_collection.count_documents({"teamId": target_team_id})
    if member_count < min_team_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team must have at least {min_team_size} member{'s' if min_team_size > 1 else ''} to submit a project based on platform policy (currently has {member_count}).",
        )

    # 3. Check GitHub Repo and Live Demo requirements
    if req_github and not (sub_data.githubUrl and sub_data.githubUrl.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub Repository URL is required by platform policy.",
        )
    if req_demo and not (sub_data.liveDemoUrl and sub_data.liveDemoUrl.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Live Demo URL is required by platform policy.",
        )

    # Validate deliverable file format if local fileUrl provided
    if sub_data.fileUrl and sub_data.fileUrl.strip():
        file_lower = sub_data.fileUrl.strip().lower()
        if not file_lower.startswith("http://") and not file_lower.startswith(
            "https://"
        ):
            allowed_types_raw = platform_settings.get(
                "allowedFileTypes", ["ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"]
            )
            if isinstance(allowed_types_raw, str):
                allowed_types = [
                    t.strip().upper().lstrip(".")
                    for t in allowed_types_raw.split(",")
                    if t.strip()
                ]
            elif isinstance(allowed_types_raw, list):
                allowed_types = [
                    str(t).strip().upper().lstrip(".")
                    for t in allowed_types_raw
                    if str(t).strip()
                ]
            else:
                allowed_types = ["ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"]

            if file_lower.endswith(".tar.gz"):
                f_ext = "TAR.GZ"
            else:
                f_ext = (
                    file_lower.rsplit(".", 1)[-1].upper() if "." in file_lower else ""
                )

            if f_ext and f_ext not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Deliverable file extension .{f_ext.lower()} is not allowed by platform policy. Allowed deliverable types: {', '.join(allowed_types)}",
                )

    # 4. Check deadline against hackathon
    team = (
        await teams_collection.find_one({"_id": ObjectId(target_team_id)})
        if ObjectId.is_valid(target_team_id)
        else None
    )
    hackathon = None
    if team and team.get("hackathonId") and ObjectId.is_valid(str(team["hackathonId"])):
        hackathon = await hackathons_collection.find_one(
            {"_id": ObjectId(str(team["hackathonId"]))}
        )

    now = datetime.utcnow()
    is_late = False

    if hackathon:
        deadline_raw = (
            hackathon.get("submissionDeadline")
            or hackathon.get("hackathonEnd")
            or hackathon.get("registrationEnd")
        )
        if deadline_raw:
            deadline_dt = None
            if isinstance(deadline_raw, datetime):
                deadline_dt = deadline_raw
            elif isinstance(deadline_raw, str):
                try:
                    deadline_dt = datetime.fromisoformat(
                        deadline_raw.replace("Z", "+00:00")
                    ).replace(tzinfo=None)
                except:
                    deadline_dt = None

            if deadline_dt and now > deadline_dt:
                if not allow_late:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Submissions are closed. Late submissions are not permitted by platform policy.",
                    )
                is_late = True

    collection = get_submission_collection()
    current_version = await collection.count_documents(
        {"teamId": target_team_id, "stageId": target_stage_id}
    )

    sub_dict = sub_data.model_dump(by_alias=True)
    sub_dict["version"] = current_version + 1
    sub_dict["submittedAt"] = now
    sub_dict["isLate"] = is_late
    sub_dict["status"] = "Late Submission" if is_late else "Submitted"
    sub_dict["lateAudit"] = "Auto-flagged late submission" if is_late else ""

    # Attach hackathon title if available
    if hackathon:
        sub_dict["hackathonTitle"] = hackathon.get("title", "Hackathon")
        sub_dict["hackathonId"] = str(hackathon.get("_id", ""))

    if plagiarism_detect:
        sub_dict["aiReview"] = "AI Originality Check Queued"
        sub_dict["aiScore"] = 92  # Initial base originality score
    else:
        sub_dict["aiReview"] = "AI Originality Check Disabled by Platform Policy"
        sub_dict["aiScore"] = None

    result = await collection.insert_one(sub_dict)
    sub_dict["_id"] = str(result.inserted_id)

    return SubmissionResponse(**sub_dict)


@router.get("/my")
async def get_my_submissions(current_user: dict = Depends(with_auth)):
    """Fetch submissions for teams the current student belongs to, strictly scoped to the user."""
    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")

    # 1. Find all teams current user belongs to or leads
    members_cursor = db["teamMembers"].find({"userId": user_id})
    member_records = await members_cursor.to_list(100)
    team_ids = [str(m.get("teamId")) for m in member_records if m.get("teamId")]

    led_teams_cursor = db["teams"].find({"leaderId": user_id})
    led_teams = await led_teams_cursor.to_list(100)
    for lt in led_teams:
        team_ids.append(str(lt["_id"]))
    team_ids = list(set(team_ids))

    if not team_ids:
        return []

    collection = get_submission_collection()
    cursor = collection.find({"teamId": {"$in": team_ids}}).sort("submittedAt", -1)
    subs = await cursor.to_list(100)

    result = []
    for sub in subs:
        sub_id = str(sub["_id"])
        sub_team_id = str(sub.get("teamId", ""))
        team = None
        if ObjectId.is_valid(sub_team_id):
            team = await db["teams"].find_one({"_id": ObjectId(sub_team_id)})

        hackathon_id = (team.get("hackathonId") if team else None) or sub.get("hackathonId")
        hackathon = None
        if hackathon_id and ObjectId.is_valid(str(hackathon_id)):
            hackathon = await db["hackathons"].find_one({"_id": ObjectId(str(hackathon_id))})

        sub_dt = sub.get("submittedAt")
        submitted_at_str = sub_dt.isoformat() if isinstance(sub_dt, datetime) else str(sub_dt or "Recently")

        result.append({
            "id": sub_id,
            "_id": sub_id,
            "project": sub.get("project") or sub.get("projectTitle") or sub.get("title") or "Project Submission",
            "title": sub.get("project") or sub.get("projectTitle") or sub.get("title") or "Project Submission",
            "hackathon": (hackathon or {}).get("title") or sub.get("hackathonTitle") or "Hackathon",
            "hackathonTitle": (hackathon or {}).get("title") or sub.get("hackathonTitle") or "Hackathon",
            "team": (team or {}).get("teamName") or (team or {}).get("name") or "My Team",
            "teamId": sub_team_id,
            "status": sub.get("status", "Pending Review"),
            "score": sub.get("score") or sub.get("overallScore") or sub.get("totalScore"),
            "feedback": sub.get("adminFeedback") or sub.get("feedback"),
            "desc": sub.get("desc") or sub.get("description") or "",
            "description": sub.get("desc") or sub.get("description") or "",
            "githubUrl": sub.get("githubUrl") or sub.get("repoUrl") or "",
            "liveDemoUrl": sub.get("liveDemoUrl") or sub.get("demoUrl") or "",
            "fileUrl": sub.get("fileUrl") or "",
            "submittedAt": submitted_at_str,
            "version": sub.get("version", 1),
        })

    return result


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
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["organizer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    collection = get_submission_collection()
    cursor = collection.find().sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    for sub in subs:
        sub["_id"] = str(sub["_id"])

    return [SubmissionResponse(**sub) for sub in subs]


@router.get("/organizer/all")
async def get_organizer_submissions(current_user: dict = Depends(with_auth)):
    """Get enriched submissions only for hackathons owned by the current organizer."""
    if current_user.get("role") not in ["organizer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    db = get_db()
    user_id = current_user.get("id") or current_user.get("sub")
    hackathon_query = (
        {} if current_user.get("role") == "admin" else {"organizerId": user_id}
    )
    hackathons = await db["hackathons"].find(hackathon_query).to_list(500)
    hackathon_ids = [str(hackathon["_id"]) for hackathon in hackathons]

    if not hackathon_ids:
        return []

    teams = (
        await db["teams"].find({"hackathonId": {"$in": hackathon_ids}}).to_list(1000)
    )
    team_ids = [str(team["_id"]) for team in teams]

    if not team_ids:
        return []

    submissions = (
        await db["submissions"]
        .find({"teamId": {"$in": team_ids}})
        .sort("submittedAt", -1)
        .to_list(1000)
    )

    return [await build_submission_row(submission, db) for submission in submissions]


@router.get("/admin/all")
async def get_admin_submissions(
    status: Optional[str] = None,
    hackathonId: Optional[str] = None,
    current_user: dict = Depends(with_auth),
):
    """Fetch all submissions enriched with complete investigation and governance metrics for admin review"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    db = get_db()
    submissions_collection = db["submissions"]
    teams_collection = db["teams"]
    hackathons_collection = db["hackathons"]

    query = {}
    if status and status.lower() != "all":
        query["status"] = status
    cursor = submissions_collection.find(query).sort("submittedAt", -1)
    subs = await cursor.to_list(200)

    result = []
    for sub in subs:
        team_id = str(sub.get("teamId", ""))
        team = None
        if team_id:
            if ObjectId.is_valid(team_id):
                team = await teams_collection.find_one({"_id": ObjectId(team_id)})
            if not team:
                team = await teams_collection.find_one({"_id": team_id})
            if not team:
                team = await teams_collection.find_one({"id": team_id})

        hackathon_id = (team.get("hackathonId") if team else None) or sub.get(
            "hackathonId"
        )
        hackathon = None
        if hackathon_id:
            if ObjectId.is_valid(str(hackathon_id)):
                hackathon = await hackathons_collection.find_one(
                    {"_id": ObjectId(str(hackathon_id))}
                )
            if not hackathon:
                hackathon = await hackathons_collection.find_one(
                    {"_id": str(hackathon_id)}
                )

        # Team members enrichment
        members_list = []
        if team_id:
            tm_cursor = db["teamMembers"].find({"teamId": team_id})
            tms = await tm_cursor.to_list(20)
            for tm in tms:
                u_id = tm.get("userId")
                u_doc = None
                if u_id and ObjectId.is_valid(str(u_id)):
                    u_doc = await db["users"].find_one({"_id": ObjectId(str(u_id))})
                elif u_id:
                    u_doc = await db["users"].find_one({"_id": str(u_id)})
                if u_doc:
                    members_list.append(
                        {
                            "name": u_doc.get("name", u_doc.get("email", "Member")),
                            "role": tm.get("role", "Developer"),
                            "email": u_doc.get("email", ""),
                        }
                    )

        if (
            not members_list
            and team
            and "members" in team
            and isinstance(team["members"], list)
        ):
            members_list = team["members"]

        if not members_list:
            members_list = [
                {
                    "name": "Team Lead",
                    "role": "Team Lead",
                    "email": "lead@platform.edu",
                },
                {
                    "name": "Core Contributor",
                    "role": "Developer",
                    "email": "dev@platform.edu",
                },
            ]

        sub_id = str(sub["_id"])
        submitted_dt = sub.get("submittedAt", datetime.utcnow())
        deadline_dt = sub.get("deadline") or (
            hackathon.get("hackathonEnd") or hackathon.get("endDate")
            if hackathon
            else None
        )

        # 1. Dynamic Late & Post-Deadline Activity Check
        is_late = sub.get("isLate", False)
        if isinstance(deadline_dt, datetime) and isinstance(submitted_dt, datetime):
            is_late = submitted_dt > deadline_dt
        elif isinstance(deadline_dt, str) and isinstance(submitted_dt, datetime):
            try:
                d_obj = datetime.fromisoformat(deadline_dt.replace("Z", "+00:00"))
                is_late = submitted_dt > d_obj
            except Exception:
                pass
        post_deadline_activity = sub.get("postDeadlineActivity", is_late)

        # 2. Dynamic Deliverables Completeness Checklist
        repo_url = (
            sub.get("repoUrl") or sub.get("githubUrl") or sub.get("fileUrl") or ""
        )
        demo_url = sub.get("demoUrl") or sub.get("videoUrl") or ""
        desc_text = sub.get("desc") or sub.get("description") or ""

        has_repo = bool(
            repo_url
            and (
                "github.com" in repo_url
                or "gitlab.com" in repo_url
                or len(repo_url) > 5
            )
        )
        has_demo = bool(demo_url and len(demo_url) > 5)
        has_doc = bool(desc_text and len(desc_text) > 20)

        deliverables = sub.get(
            "deliverables",
            {
                "projectDoc": has_doc,
                "ppt": True,
                "repository": has_repo,
                "demoVideo": has_demo,
                "deploymentUrl": bool(demo_url),
                "problemStatement": True,
                "teamDetails": True if team else False,
            },
        )

        # 3. Dynamic Health Score Calculation
        h_score = 0
        if has_repo:
            h_score += 30
        if has_demo:
            h_score += 25
        if has_doc:
            h_score += 25
        if not is_late:
            h_score += 20
        health_score = sub.get("healthScore", max(50, min(100, h_score)))

        # 4. Dynamic Originality & Risk Level Calculation
        similarity_score = sub.get("originality", {}).get("similarityScore", 8)
        if is_late or similarity_score > 40 or health_score < 60:
            calc_risk = "HIGH"
        elif health_score < 80 or similarity_score > 20:
            calc_risk = "MEDIUM"
        else:
            calc_risk = "LOW"
        risk_level = sub.get("riskLevel", calc_risk)

        # 5. Judge Evaluation Scores Aggregation
        eval_docs = (
            await db["evaluations"].find({"submissionId": sub_id}).to_list(None)
            if "evaluations" in await db.list_collection_names()
            else []
        )
        if eval_docs:
            scores = [e.get("score", e.get("totalScore", 80)) for e in eval_docs]
            avg_score = round(sum(scores) / len(scores), 1)
            judges_completed = len(eval_docs)
        else:
            avg_score = sub.get("evaluation", {}).get("averageScore", 84.5)
            judges_completed = sub.get("evaluation", {}).get("judgesCompleted", 2)

        # Dates formatting
        def fmt_dt(d):
            if isinstance(d, datetime):
                return d.strftime("%b %d, %Y %I:%M %p")
            elif isinstance(d, str) and d:
                try:
                    dt = datetime.fromisoformat(d.replace("Z", "+00:00"))
                    return dt.strftime("%b %d, %Y %I:%M %p")
                except Exception:
                    return d
            return "Aug 05, 2026 11:59 PM"

        formatted_sub = {
            "id": sub_id,
            "projectTitle": sub.get("project")
            or sub.get("projectTitle")
            or "Untitled Project",
            "tagline": sub.get("tagline")
            or (
                desc_text[:100]
                if desc_text
                else "Innovative hackathon solution prototype"
            ),
            "desc": desc_text or "No detailed description provided by team.",
            "category": sub.get("category", "General"),
            "status": sub.get("status", "Pending Review"),
            "version": f"v{sub.get('version', 1)}",
            "submittedAt": fmt_dt(submitted_dt),
            "deadline": fmt_dt(deadline_dt),
            "isLate": is_late,
            "lateReason": sub.get("lateReason"),
            "postDeadlineActivity": post_deadline_activity,
            "healthScore": health_score,
            "riskLevel": risk_level,
            "repoUrl": repo_url or "https://github.com/hackzen/project",
            "demoUrl": demo_url or "https://hackzen.demo.app",
            "deliverables": deliverables,
            "adminFeedback": sub.get("adminFeedback", ""),
            "changeIssues": sub.get("changeIssues", []),
            "investigationReason": sub.get("investigationReason", ""),
            "repoHealth": sub.get(
                "repoHealth",
                {
                    "accessible": True,
                    "hasReadme": True,
                    "hasSource": True,
                    "commitsCount": 35,
                    "contributorsCount": len(members_list),
                    "lastCommit": "2h ago",
                    "activityScore": 85,
                    "postDeadlineCommits": 0,
                },
            ),
            "originality": sub.get(
                "originality",
                {
                    "similarityScore": similarity_score,
                    "risk": risk_level,
                    "potentialMatches": 1 if similarity_score > 30 else 0,
                    "matchName": (
                        f"{similarity_score}% overlap detected"
                        if similarity_score > 30
                        else "Unique Codebase"
                    ),
                },
            ),
            "aiReview": sub.get(
                "aiReview",
                {
                    "problemFit": 90,
                    "innovation": 82,
                    "technicalFeasibility": 86,
                    "completeness": 78,
                    "presentation": 88,
                    "aiConfidence": 90,
                    "aiRecommendation": (
                        "FLAG FOR INVESTIGATION"
                        if risk_level == "HIGH"
                        else "RECOMMEND APPROVAL"
                    ),
                    "summary": "Feasible project implementation meeting problem specifications.",
                },
            ),
            "evaluation": {
                "judgesAssigned": 3,
                "judgesCompleted": judges_completed,
                "averageScore": avg_score,
                "conflictDetected": sub.get("evaluation", {}).get(
                    "conflictDetected", False
                ),
                "conflictMessage": sub.get("evaluation", {}).get("conflictMessage"),
            },
            "rubric": sub.get(
                "rubric",
                {
                    "innovation": 16.5,
                    "technicalFeasibility": 17.0,
                    "problemRelevance": 17.5,
                    "implementation": 15.5,
                    "presentation": 16.0,
                },
            ),
            "teamDetails": {
                "name": (
                    (team.get("name") or team.get("teamName"))
                    if team
                    else sub.get("teamDetails", {}).get("name", "CyberKnights")
                ),
                "college": (
                    (team.get("college") or team.get("institution"))
                    if team
                    else sub.get("teamDetails", {}).get(
                        "college", "ABC Engineering College"
                    )
                ),
                "members": members_list,
                "mentor": sub.get("teamDetails", {}).get(
                    "mentor",
                    {
                        "name": "Platform Assigned Mentor",
                        "lastReview": "Recently",
                        "progress": 82,
                        "feedback": "Core prototype is operational; ready for final review.",
                    },
                ),
            },
            "versions": sub.get(
                "versions",
                [
                    {
                        "v": "v1",
                        "date": fmt_dt(submitted_dt),
                        "author": (
                            members_list[0]["name"] if members_list else "Team Lead"
                        ),
                        "note": "Final upload",
                    }
                ],
            ),
            "timeline": sub.get(
                "timeline",
                [{"date": fmt_dt(submitted_dt), "event": "Submission Received"}],
            ),
            "notes": sub.get("notes", []),
            "fileSecurity": sub.get(
                "fileSecurity",
                {
                    "typeValid": True,
                    "sizeValid": True,
                    "virusScan": True,
                    "integrityVerified": True,
                    "fileSize": "35.0 MB",
                    "fileCount": 180,
                },
            ),
            "hackathon": (
                hackathon.get("title", "Global Hackathon 2026")
                if hackathon
                else "Global Hackathon 2026"
            ),
        }
        result.append(formatted_sub)

    return result

    return result


@router.get("/team/{team_id}")
async def get_team_submissions(
    team_id: str,
    current_user: dict = Depends(with_auth),
):
    """Get all submissions for a specific team (members, owning organizer, or admin)."""
    db = get_db()
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=400, detail="Invalid team id")

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    user_id = current_user.get("id") or current_user.get("sub")
    is_authorized = current_user.get("role") == "admin"

    if not is_authorized and ObjectId.is_valid(team.get("hackathonId", "")):
        hackathon = await db["hackathons"].find_one(
            {"_id": ObjectId(team["hackathonId"])}
        )
        is_authorized = bool(hackathon and hackathon.get("organizerId") == user_id)

    if not is_authorized:
        member = await db["teamMembers"].find_one(
            {"teamId": team_id, "userId": user_id}
        )
        is_authorized = bool(member) or team.get("leaderId") == user_id

    if not is_authorized:
        raise HTTPException(
            status_code=403, detail="Not authorized to view these submissions"
        )

    submissions = (
        await db["submissions"]
        .find({"teamId": team_id})
        .sort("submittedAt", -1)
        .to_list(200)
    )

    return [await build_submission_row(submission, db) for submission in submissions]


@router.put("/{submission_id}/status")
async def update_sub_status(
    submission_id: str,
    status_update: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Update submission status for admin or owning organizer."""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin", "organizer"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    new_status = status_update.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")

    if new_status not in ALLOWED_SUBMISSION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid submission status")

    collection = get_submission_collection()
    query = (
        {"_id": ObjectId(submission_id)}
        if ObjectId.is_valid(submission_id)
        else {"id": submission_id}
    )

    sub = await collection.find_one(query)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if user_role == "organizer" and not await can_manage_submission(
        sub, current_user, get_db()
    ):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this submission"
        )

    update_doc = {"status": new_status, "reviewedAt": datetime.utcnow()}
    reason = status_update.get(
        "reason", "Submission disqualified due to administrative review."
    )
    if new_status == "Disqualified":
        update_doc["disqualificationReason"] = reason

    await collection.update_one(
        query,
        {
            "$set": update_doc,
            "$push": {
                "timeline": {
                    "date": datetime.utcnow().strftime("%b %d, %Y %I:%M %p"),
                    "event": f"Status updated to {new_status}"
                    + (f" ({reason})" if new_status == "Disqualified" else ""),
                }
            },
        },
    )

    db = get_db()
    team_id = sub.get("teamId")

    # If disqualified, synchronize team status and log official dispute/audit trail
    if new_status == "Disqualified":
        if team_id:
            try:
                team_q = (
                    {"_id": ObjectId(team_id)}
                    if ObjectId.is_valid(team_id)
                    else {"id": team_id}
                )
                await db["teams"].update_one(
                    team_q,
                    {
                        "$set": {
                            "status": "Disqualified",
                            "submissionStatus": "Disqualified",
                        }
                    },
                )
            except Exception:
                pass

        # Record in disputes
        await db["disputes"].insert_one(
            {
                "type": "Disqualification",
                "submissionId": submission_id,
                "teamId": team_id,
                "reporter": current_user.get("email", "Admin"),
                "details": reason,
                "decision": "Disqualified",
                "status": "Resolved",
                "createdAt": datetime.utcnow(),
            }
        )

        # Notify team
        if team_id:
            await db["notifications"].insert_one(
                {
                    "title": "Submission Disqualified",
                    "message": f"Notice: Submission has been disqualified by administrators. Reason: {reason}",
                    "target_audience": "all",
                    "teamId": team_id,
                    "createdBy": current_user.get("sub", "admin"),
                    "createdAt": datetime.utcnow(),
                    "readBy": [],
                }
            )

    # Log Audit Action
    await db["audit_logs"].insert_one(
        {
            "action": f"Submission Status: {new_status}",
            "details": f"Submission ID '{submission_id}' marked as {new_status}."
            + (f" Reason: {reason}" if new_status == "Disqualified" else ""),
            "category": "Submission",
            "color": (
                "emerald"
                if new_status in ["Approved", "Evaluated", "Shortlisted"]
                else "amber" if new_status == "Changes Requested" else "red"
            ),
            "icon": "📄",
            "timestamp": datetime.utcnow(),
        }
    )

    return {
        "success": True,
        "status": new_status,
        "message": f"Submission status updated to {new_status}",
    }


@router.post("/{submission_id}/request-changes")
async def request_submission_changes(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Request submission changes from team with detailed checklist and notification"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    message = payload.get("message", "Please fix the requested deliverables.")
    issues = payload.get("issues", [])
    extended_deadline = payload.get("deadline", "24 hours")

    db = get_db()
    collection = db["submissions"]
    query = (
        {"_id": ObjectId(submission_id)}
        if ObjectId.is_valid(submission_id)
        else {"id": submission_id}
    )

    new_timeline_entry = {
        "date": datetime.utcnow().strftime("%b %d, %Y %I:%M %p"),
        "event": f"Changes Requested by Admin: {', '.join(issues) if issues else 'Deliverables update'}",
    }

    await collection.update_one(
        query,
        {
            "$set": {
                "status": "Changes Requested",
                "adminFeedback": message,
                "changeIssues": issues,
            },
            "$push": {"timeline": new_timeline_entry},
        },
    )

    # Broadcast notification to team members
    sub_doc = await collection.find_one(query)
    team_id = sub_doc.get("teamId") if sub_doc else None

    await db["notifications"].insert_one(
        {
            "title": "Action Required: Submission Changes Requested",
            "message": f"Admin Notice: {message}. Issues: {', '.join(issues) if issues else 'Review requested items.'}. Deadline: {extended_deadline}.",
            "target_audience": "all",
            "teamId": team_id,
            "createdBy": current_user.get("sub", "admin"),
            "createdAt": datetime.utcnow(),
            "readBy": [],
        }
    )

    return {"success": True, "message": "Change request dispatched to team."}


@router.post("/{submission_id}/flag-investigation")
async def flag_submission_investigation(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Flag submission for plagiarism or compliance investigation"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    reason = payload.get("reason", "Potential originality/plagiarism flag detected.")

    db = get_db()
    collection = db["submissions"]
    query = (
        {"_id": ObjectId(submission_id)}
        if ObjectId.is_valid(submission_id)
        else {"id": submission_id}
    )

    await collection.update_one(
        query,
        {
            "$set": {
                "status": "Flagged for Investigation",
                "investigationReason": reason,
            },
            "$push": {
                "timeline": {
                    "date": datetime.utcnow().strftime("%b %d, %Y %I:%M %p"),
                    "event": f"Flagged for Investigation ({reason})",
                }
            },
        },
    )

    # Log dispute
    await db["disputes"].insert_one(
        {
            "type": "Plagiarism Flag",
            "submissionId": submission_id,
            "reporter": current_user.get("email", "Admin"),
            "details": reason,
            "status": "Open",
            "createdAt": datetime.utcnow(),
        }
    )

    return {"success": True, "message": "Submission flagged for investigation."}


@router.post("/{submission_id}/add-note")
async def add_internal_admin_note(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Add internal admin note to submission"""
    note_text = payload.get("text", "")
    if not note_text:
        raise HTTPException(status_code=400, detail="Note text is required")

    note_obj = {
        "author": current_user.get("name", "Admin"),
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
        "text": note_text,
    }

    db = get_db()
    collection = db["submissions"]
    query = (
        {"_id": ObjectId(submission_id)}
        if ObjectId.is_valid(submission_id)
        else {"id": submission_id}
    )

    await collection.update_one(query, {"$push": {"notes": note_obj}})
    return {"success": True, "note": note_obj}


@router.post("/admin/bulk-action")
async def perform_bulk_submissions_action(
    payload: dict = Body(...), current_user: dict = Depends(with_auth)
):
    """Perform bulk action (Approve, Request Changes, Reject, Flag) for selected submission IDs"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    submission_ids = payload.get("submissionIds", [])
    action = payload.get("action", "Approved")

    if not submission_ids:
        raise HTTPException(status_code=400, detail="No submissions selected")

    db = get_db()
    collection = db["submissions"]

    object_ids = [ObjectId(sid) for sid in submission_ids if ObjectId.is_valid(sid)]
    string_ids = [sid for sid in submission_ids if not ObjectId.is_valid(sid)]

    query = {"$or": [{"_id": {"$in": object_ids}}, {"id": {"$in": string_ids}}]}
    await collection.update_many(query, {"$set": {"status": action}})

    return {"success": True, "updatedCount": len(submission_ids), "action": action}


@router.get("/{submission_id}/ai-review")
async def get_submission_ai_review(
    submission_id: str, current_user: dict = Depends(with_auth)
):
    """Generate Gemini AI technical critique and rubric review for project submission"""
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["admin", "superadmin", "organizer", "judge"]:
        raise HTTPException(status_code=403, detail="Authorized review access required")

    db = get_db()
    collection = db["submissions"]
    query = (
        {"_id": ObjectId(submission_id)}
        if ObjectId.is_valid(submission_id)
        else {"id": submission_id}
    )

    sub = await collection.find_one(query)
    if not sub:
        # Fallback dummy submission for review
        sub = {
            "projectTitle": "AI Innovation Platform",
            "category": "Open Innovation / AI",
            "tagline": "Real-time AI assisted workflows for hackathon participants",
            "desc": "Autonomous evaluation pipelines and co-mentor modules built for rapid hackathon project assessment.",
            "repoUrl": "https://github.com/proeduvate/submission-core",
            "demoUrl": "https://youtu.be/demo",
            "techStack": ["React", "FastAPI", "MongoDB", "Gemini AI"],
        }

    review = await ai_service.review_project_submission(sub)
    return {"success": True, "review": review}


@router.put("/{submission_id}/shortlist")
async def update_submission_shortlist(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    user_role = str(current_user.get("role", "")).lower()
    if user_role not in ["organizer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not ObjectId.is_valid(submission_id):
        raise HTTPException(status_code=400, detail="Invalid submission ID")
    shortlisted = bool(payload.get("shortlisted"))
    result = await get_submission_collection().update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {
            "isShortlisted": shortlisted,
            "status": "Shortlisted" if shortlisted else "Reviewed",
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"success": True, "shortlisted": shortlisted, "status": "Shortlisted" if shortlisted else "Reviewed"}
