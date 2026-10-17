
from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File
from typing import List, Optional, Dict, Any
import os
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth
from database import get_db
from schemas.submission import SubmissionCreate, SubmissionResponse
from services.ai_service import ai_service

router = APIRouter()

ALLOWED_SUBMISSION_STATUSES = {
    "Submitted",
    "Late Submission",
    "Pending",
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


def submission_query(submission_id: str) -> Dict[str, Any]:
    if ObjectId.is_valid(submission_id):
        return {"_id": ObjectId(submission_id)}
    return {"id": submission_id}


def as_datetime(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value

    if isinstance(value, str) and value.strip():
        try:
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
            return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed
        except (ValueError, TypeError):
            return None

    return None


def format_datetime(value, date_format="%b %d, %Y %I:%M %p"):
    parsed = as_datetime(value)
    return parsed.strftime(date_format) if parsed else None


def clean_document_id(document):
    if not document:
        return document

    cleaned = dict(document)
    if cleaned.get("_id") is not None:
        cleaned["_id"] = str(cleaned["_id"])
    return cleaned


async def build_submission_row(
    submission: Dict[str, Any], db
) -> Dict[str, Any]:
    sub_id = str(submission.get("_id", submission.get("id", "")))
    team_id = str(submission.get("teamId", "") or "")

    team = None
    if team_id:
        if ObjectId.is_valid(team_id):
            team = await db["teams"].find_one({"_id": ObjectId(team_id)})
        if not team:
            team = await db["teams"].find_one({"id": team_id})

    hackathon_id = (
        (team or {}).get("hackathonId")
        or submission.get("hackathonId")
    )

    hackathon = None
    if hackathon_id:
        hackathon_id = str(hackathon_id)
        if ObjectId.is_valid(hackathon_id):
            hackathon = await db["hackathons"].find_one(
                {"_id": ObjectId(hackathon_id)}
            )
        if not hackathon:
            hackathon = await db["hackathons"].find_one({"id": hackathon_id})

    evaluation_count = await db["evaluations"].count_documents(
        {"submissionId": sub_id}
    )

    submitted_at = submission.get("submittedAt")
    project_title = (
        submission.get("project")
        or submission.get("projectTitle")
        or submission.get("title")
    )
    team_name = (team or {}).get("teamName") or (team or {}).get("name")
    hackathon_title = (
        (hackathon or {}).get("title")
        or submission.get("hackathonTitle")
    )

    return {
        "id": sub_id,
        "teamId": team_id or None,
        "team": team_name,
        "logo": team_name[0] if team_name else None,
        "teamCode": (team or {}).get("teamCode"),
        "hackathonId": (
            str(hackathon.get("_id"))
            if hackathon and hackathon.get("_id")
            else hackathon_id
        ),
        "hackathon": hackathon_title,
        "title": project_title,
        "project": project_title,
        "description": submission.get("desc") or submission.get("description") or "",
        "desc": submission.get("desc") or submission.get("description") or "",
        "track": submission.get("category"),
        "category": submission.get("category"),
        "status": submission.get("status"),
        "time": format_datetime(submitted_at, "%b %d, %Y"),
        "submittedAt": (
            submitted_at.isoformat()
            if isinstance(submitted_at, datetime)
            else submitted_at
        ),
        "fileUrl": submission.get("fileUrl"),
        "githubUrl": submission.get("githubUrl") or submission.get("repoUrl"),
        "liveDemoUrl": submission.get("liveDemoUrl") or submission.get("demoUrl"),
        "version": submission.get("version"),
        "evaluationCount": evaluation_count,
        "score": (
            submission.get("totalScore")
            if submission.get("totalScore") is not None
            else submission.get("overallScore", submission.get("score"))
        ),
        "feedback": submission.get("adminFeedback") or submission.get("feedback"),
    }


async def can_manage_submission(
    submission: Dict[str, Any], current_user: Dict[str, Any], db
) -> bool:
    role = str(current_user.get("role", "")).lower()

    if role in ["admin", "superadmin"]:
        return True

    if role != "organizer":
        return False

    team_id = str(submission.get("teamId", "") or "")
    if not team_id:
        return False

    team = None
    if ObjectId.is_valid(team_id):
        team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        team = await db["teams"].find_one({"id": team_id})

    if not team:
        return False

    hackathon_id = str(team.get("hackathonId", "") or "")
    if not hackathon_id:
        return False

    hackathon = None
    if ObjectId.is_valid(hackathon_id):
        hackathon = await db["hackathons"].find_one(
            {"_id": ObjectId(hackathon_id)}
        )
    if not hackathon:
        hackathon = await db["hackathons"].find_one({"id": hackathon_id})

    user_id = str(
        current_user.get("id")
        or current_user.get("sub")
        or current_user.get("_id")
        or ""
    )
    return bool(
        hackathon
        and str(hackathon.get("organizerId", "")) == user_id
    )


@router.post("/upload")
async def upload_submission_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(with_auth),
):
    """Upload a deliverable after validating current platform settings."""
    db = get_db()
    platform_settings = (
        await db["settings"].find_one({"key": "global_config"}) or {}
    )

    max_size_setting = platform_settings.get(
        "maxUploadFileSize",
        platform_settings.get("maxUploadSizeMB", "100 MB"),
    )

    try:
        digits = "".join(
            character
            for character in str(max_size_setting)
            if character.isdigit()
        )
        max_mb = int(digits) if digits else 100
        if max_mb <= 0:
            max_mb = 100
    except (ValueError, TypeError):
        max_mb = 100

    max_bytes = max_mb * 1024 * 1024

    allowed_raw = platform_settings.get(
        "allowedFileTypes",
        ["ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"],
    )

    if isinstance(allowed_raw, str):
        allowed_types = [
            item.strip().upper().lstrip(".")
            for item in allowed_raw.split(",")
            if item.strip()
        ]
    elif isinstance(allowed_raw, list):
        allowed_types = [
            str(item).strip().upper().lstrip(".")
            for item in allowed_raw
            if str(item).strip()
        ]
    else:
        allowed_types = ["ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"]

    filename = os.path.basename(file.filename or "deliverable")
    filename_lower = filename.lower()

    if filename_lower.endswith(".tar.gz"):
        extension = "TAR.GZ"
    else:
        extension = (
            filename.rsplit(".", 1)[-1].upper()
            if "." in filename
            else ""
        )

    if extension not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File extension .{extension.lower()} is not allowed. "
                f"Allowed types: {', '.join(allowed_types)}"
            ),
        )

    contents = await file.read()
    file_size = len(contents)

    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds the platform upload limit of {max_size_setting}.",
        )

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    upload_dir = os.path.join(os.getcwd(), "uploads", "submissions")
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = int(datetime.utcnow().timestamp())
    stored_filename = f"{timestamp}_{filename.replace(' ', '_')}"
    file_path = os.path.join(upload_dir, stored_filename)

    with open(file_path, "wb") as output_file:
        output_file.write(contents)

    return {
        "success": True,
        "filename": filename,
        "fileUrl": f"/uploads/submissions/{stored_filename}",
        "sizeBytes": file_size,
        "sizeMB": round(file_size / (1024 * 1024), 2),
        "extension": extension,
    }


@router.get("/my")
async def get_my_submissions(current_user: dict = Depends(with_auth)):
    """Return submissions belonging to the authenticated student's teams."""
    db = get_db()

    user_id = str(
        current_user.get("id")
        or current_user.get("sub")
        or current_user.get("_id")
        or ""
    )

    if not user_id:
        raise HTTPException(status_code=401, detail="User identity is missing.")

    member_records = await db["teamMembers"].find(
        {"userId": user_id}
    ).to_list(500)

    team_ids = {
        str(record["teamId"])
        for record in member_records
        if record.get("teamId")
    }

    async for team in db["teams"].find({"leaderId": user_id}):
        team_ids.add(str(team["_id"]))

    conditions = [{"submittedBy": user_id}, {"userId": user_id}]
    if team_ids:
        conditions.append({"teamId": {"$in": list(team_ids)}})

    submissions = await db["submissions"].find(
        {"$or": conditions}
    ).sort("submittedAt", -1).to_list(200)

    return [
        await build_submission_row(submission, db)
        for submission in submissions
    ]


@router.post(
    "/",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_submission(
    sub_data: SubmissionCreate,
    current_user: dict = Depends(with_auth),
):
    """Create one submission per team and stage after validating platform rules."""
    db = get_db()
    members_collection = db["teamMembers"]
    teams_collection = db["teams"]
    hackathons_collection = db["hackathons"]
    collection = get_submission_collection()

    user_id = str(
        current_user.get("id")
        or current_user.get("sub")
        or current_user.get("_id")
        or ""
    )

    target_team_id = str(
        getattr(sub_data, "teamId", None)
        or getattr(sub_data, "team_id", "")
        or ""
    )
    target_stage_id = str(
        getattr(sub_data, "stageId", None)
        or getattr(sub_data, "stage_id", None)
        or "initial_stage"
    )

    if not target_team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="teamId is required.",
        )

    member_query = {"teamId": target_team_id, "userId": user_id}
    is_member = await members_collection.find_one(member_query)

    # Support team leaders whose membership record is absent.
    team = None
    if ObjectId.is_valid(target_team_id):
        team = await teams_collection.find_one(
            {"_id": ObjectId(target_team_id)}
        )
    if not team:
        team = await teams_collection.find_one({"id": target_team_id})

    is_leader = bool(
        team and str(team.get("leaderId", "")) == user_id
    )

    if not is_member and not is_leader:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only members of the team can submit projects.",
        )

    platform_settings = (
        await db["settings"].find_one({"key": "global_config"}) or {}
    )

    allow_late = bool(platform_settings.get("allowLateSubmissions", False))

    try:
        min_team_size = max(1, int(platform_settings.get("minTeamSize", 1)))
    except (ValueError, TypeError):
        min_team_size = 1

    require_github = bool(
        platform_settings.get(
            "gitHubRepo",
            platform_settings.get("requireGithubRepo", False),
        )
    )
    require_demo = bool(
        platform_settings.get(
            "demoUrl",
            platform_settings.get("requireLiveDemo", False),
        )
    )
    plagiarism_enabled = bool(
        platform_settings.get("plagiarismDetect", True)
    )

    member_count = await members_collection.count_documents(
        {"teamId": target_team_id}
    )
    if is_leader and not is_member and team:
        member_count = max(member_count, 1)

    if member_count < min_team_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Team must have at least {min_team_size} member(s) "
                "to submit under the current platform policy."
            ),
        )

    github_url = getattr(sub_data, "githubUrl", None)
    live_demo_url = getattr(sub_data, "liveDemoUrl", None)

    if require_github and not (
        isinstance(github_url, str) and github_url.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub Repository URL is required by platform policy.",
        )

    if require_demo and not (
        isinstance(live_demo_url, str) and live_demo_url.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Live Demo URL is required by platform policy.",
        )

    file_url = getattr(sub_data, "fileUrl", None)
    if isinstance(file_url, str) and file_url.strip():
        normalized_url = file_url.strip().lower()

        if not normalized_url.startswith(("http://", "https://")):
            allowed_raw = platform_settings.get(
                "allowedFileTypes",
                ["ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"],
            )

            if isinstance(allowed_raw, str):
                allowed_types = [
                    item.strip().upper().lstrip(".")
                    for item in allowed_raw.split(",")
                    if item.strip()
                ]
            elif isinstance(allowed_raw, list):
                allowed_types = [
                    str(item).strip().upper().lstrip(".")
                    for item in allowed_raw
                    if str(item).strip()
                ]
            else:
                allowed_types = [
                    "ZIP", "PDF", "PPTX", "DOCX", "MP4", "TAR.GZ"
                ]

            if normalized_url.endswith(".tar.gz"):
                extension = "TAR.GZ"
            else:
                extension = (
                    normalized_url.rsplit(".", 1)[-1].upper()
                    if "." in normalized_url
                    else ""
                )

            if not extension or extension not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The deliverable file type is not allowed by platform policy.",
                )

    hackathon = None
    hackathon_id = (team or {}).get("hackathonId")

    if hackathon_id:
        hackathon_id = str(hackathon_id)
        if ObjectId.is_valid(hackathon_id):
            hackathon = await hackathons_collection.find_one(
                {"_id": ObjectId(hackathon_id)}
            )
        if not hackathon:
            hackathon = await hackathons_collection.find_one(
                {"id": hackathon_id}
            )

    now = datetime.utcnow()
    is_late = False

    if hackathon:
        deadline_raw = (
            hackathon.get("submissionDeadline")
            or hackathon.get("hackathonEnd")
            or hackathon.get("endDate")
        )
        deadline = as_datetime(deadline_raw)

        if deadline and now > deadline:
            if not allow_late:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Submissions are closed. Late submissions "
                        "are not permitted by platform policy."
                    ),
                )
            is_late = True

    # Do not create duplicate submissions for the same team and stage.
    existing_submission = await collection.find_one(
        {"teamId": target_team_id, "stageId": target_stage_id}
    )
    if existing_submission:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A submission already exists for this team and stage. "
                "Use the existing submission workflow instead of creating "
                "a duplicate."
            ),
        )

    current_version = await collection.count_documents(
        {"teamId": target_team_id, "stageId": target_stage_id}
    )

    sub_dict = sub_data.model_dump(by_alias=True)
    sub_dict["teamId"] = target_team_id
    sub_dict["stageId"] = target_stage_id
    sub_dict["version"] = current_version + 1
    sub_dict["submittedAt"] = now
    sub_dict["isLate"] = is_late
    sub_dict["status"] = "Late Submission" if is_late else "Submitted"
    sub_dict["lateAudit"] = (
        "Auto-flagged late submission" if is_late else ""
    )

    if hackathon:
        sub_dict["hackathonTitle"] = hackathon.get("title")
        sub_dict["hackathonId"] = str(hackathon.get("_id", hackathon_id or ""))

    # This is a processing state, not a claimed AI score or review result.
    if plagiarism_enabled:
        sub_dict["aiReview"] = "AI Originality Check Queued"
        sub_dict["aiScore"] = None
    else:
        sub_dict["aiReview"] = (
            "AI Originality Check Disabled by Platform Policy"
        )
        sub_dict["aiScore"] = None

    inserted = await collection.insert_one(sub_dict)
    sub_dict["_id"] = str(inserted.inserted_id)

    return SubmissionResponse(**sub_dict)


@router.get("/team/{team_id}")
async def get_team_submissions(
    team_id: str,
    current_user: dict = Depends(with_auth),
):
    """Return submissions only to team members, the owning organizer, or admins."""
    db = get_db()

    team = None
    if ObjectId.is_valid(team_id):
        team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        team = await db["teams"].find_one({"id": team_id})

    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    user_id = str(
        current_user.get("id")
        or current_user.get("sub")
        or current_user.get("_id")
        or ""
    )
    role = str(current_user.get("role", "")).lower()

    authorized = role in ["admin", "superadmin"]

    if not authorized and role == "organizer":
        hackathon_id = str(team.get("hackathonId", "") or "")
        hackathon = None

        if hackathon_id and ObjectId.is_valid(hackathon_id):
            hackathon = await db["hackathons"].find_one(
                {"_id": ObjectId(hackathon_id)}
            )
        if not hackathon and hackathon_id:
            hackathon = await db["hackathons"].find_one(
                {"id": hackathon_id}
            )

        authorized = bool(
            hackathon
            and str(hackathon.get("organizerId", "")) == user_id
        )

    if not authorized:
        member = await db["teamMembers"].find_one(
            {"teamId": team_id, "userId": user_id}
        )
        authorized = bool(member) or str(team.get("leaderId", "")) == user_id

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these submissions.",
        )

    submissions = await db["submissions"].find(
        {"teamId": team_id}
    ).sort("submittedAt", -1).to_list(200)

    return [
        await build_submission_row(submission, db)
        for submission in submissions
    ]


@router.get("/", response_model=List[SubmissionResponse])
async def get_all_submissions(current_user: dict = Depends(with_auth)):
    """List all submissions for organizer and administrator accounts."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["organizer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")

    submissions = await get_submission_collection().find(
        {}
    ).sort("submittedAt", -1).to_list(200)

    return [
        SubmissionResponse(**clean_document_id(submission))
        for submission in submissions
    ]


@router.get("/organizer/all")
async def get_organizer_submissions(
    current_user: dict = Depends(with_auth),
):
    """List submissions from hackathons owned by this organizer."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["organizer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")

    db = get_db()
    user_id = str(
        current_user.get("id")
        or current_user.get("sub")
        or current_user.get("_id")
        or ""
    )

    hackathon_query = (
        {}
        if role in ["admin", "superadmin"]
        else {"organizerId": user_id}
    )

    hackathons = await db["hackathons"].find(
        hackathon_query
    ).to_list(500)

    hackathon_ids = [str(item["_id"]) for item in hackathons]
    if not hackathon_ids:
        return []

    teams = await db["teams"].find(
        {"hackathonId": {"$in": hackathon_ids}}
    ).to_list(1000)

    team_ids = [str(item["_id"]) for item in teams]
    if not team_ids:
        return []

    submissions = await db["submissions"].find(
        {"teamId": {"$in": team_ids}}
    ).sort("submittedAt", -1).to_list(1000)

    return [
        await build_submission_row(submission, db)
        for submission in submissions
    ]


@router.get("/admin/all")
async def get_admin_submissions(
    status: Optional[str] = None,
    hackathonId: Optional[str] = None,
    current_user: dict = Depends(with_auth),
):
    """Return actual submission, team, and evaluation data for admin review."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required.")

    db = get_db()
    query = {}

    if status and status.lower() != "all":
        query["status"] = status
    if hackathonId:
        query["hackathonId"] = hackathonId

    submissions = await db["submissions"].find(
        query
    ).sort("submittedAt", -1).to_list(200)

    results = []

    for sub in submissions:
        sub_id = str(sub.get("_id", sub.get("id", "")))
        team_id = str(sub.get("teamId", "") or "")

        team = None
        if team_id and ObjectId.is_valid(team_id):
            team = await db["teams"].find_one({"_id": ObjectId(team_id)})
        if not team and team_id:
            team = await db["teams"].find_one({"id": team_id})

        resolved_hackathon_id = (
            (team or {}).get("hackathonId")
            or sub.get("hackathonId")
        )
        hackathon = None

        if resolved_hackathon_id:
            resolved_hackathon_id = str(resolved_hackathon_id)
            if ObjectId.is_valid(resolved_hackathon_id):
                hackathon = await db["hackathons"].find_one(
                    {"_id": ObjectId(resolved_hackathon_id)}
                )
            if not hackathon:
                hackathon = await db["hackathons"].find_one(
                    {"id": resolved_hackathon_id}
                )

        members_list = []
        if team_id:
            team_members = await db["teamMembers"].find(
                {"teamId": team_id}
            ).to_list(100)

            for membership in team_members:
                member_id = str(membership.get("userId", "") or "")
                user = None

                if member_id and ObjectId.is_valid(member_id):
                    user = await db["users"].find_one(
                        {"_id": ObjectId(member_id)}
                    )
                if not user and member_id:
                    user = await db["users"].find_one({"id": member_id})

                if user:
                    members_list.append(
                        {
                            "name": user.get("name") or user.get("fullName"),
                            "role": membership.get("role"),
                            "email": user.get("email"),
                        }
                    )

        if not members_list and isinstance((team or {}).get("members"), list):
            members_list = (team or {}).get("members", [])

        submitted_at = sub.get("submittedAt")
        deadline_raw = (
            sub.get("submissionDeadline")
            or sub.get("deadline")
            or (hackathon or {}).get("submissionDeadline")
            or (hackathon or {}).get("hackathonEnd")
            or (hackathon or {}).get("endDate")
        )

        deadline = as_datetime(deadline_raw)
        submitted_datetime = as_datetime(submitted_at)

        is_late = sub.get("isLate")
        if is_late is None and deadline and submitted_datetime:
            is_late = submitted_datetime > deadline

        description = sub.get("desc") or sub.get("description") or ""
        repo_url = sub.get("repoUrl") or sub.get("githubUrl")
        demo_url = (
            sub.get("demoUrl")
            or sub.get("liveDemoUrl")
            or sub.get("videoUrl")
        )
        file_url = sub.get("fileUrl")

        existing_deliverables = sub.get("deliverables")
        if isinstance(existing_deliverables, dict):
            deliverables = existing_deliverables
        else:
            file_extension = ""
            if isinstance(file_url, str):
                lower_file_url = file_url.lower()
                file_extension = (
                    "tar.gz"
                    if lower_file_url.endswith(".tar.gz")
                    else lower_file_url.rsplit(".", 1)[-1]
                    if "." in lower_file_url
                    else ""
                )

            deliverables = {
                "projectDoc": bool(description.strip()),
                "ppt": file_extension in ["ppt", "pptx"],
                "repository": bool(repo_url),
                "demoVideo": bool(
                    isinstance(demo_url, str)
                    and demo_url.lower().endswith(
                        (".mp4", ".mov", ".webm", ".m4v")
                    )
                ),
                "deploymentUrl": bool(demo_url),
                "problemStatement": bool(
                    sub.get("problemStatement")
                    or sub.get("problem")
                ),
                "teamDetails": bool(team),
            }

        evaluation_docs = await db["evaluations"].find(
            {"submissionId": sub_id}
        ).to_list(500)

        numeric_scores = []
        for evaluation in evaluation_docs:
            score = evaluation.get(
                "totalScore",
                evaluation.get("score"),
            )

            if score is None and isinstance(evaluation.get("scores"), dict):
                values = [
                    value
                    for value in evaluation["scores"].values()
                    if isinstance(value, (int, float))
                    and not isinstance(value, bool)
                ]
                if values:
                    score = sum(values)

            if isinstance(score, (int, float)) and not isinstance(score, bool):
                numeric_scores.append(float(score))

        average_score = (
            round(sum(numeric_scores) / len(numeric_scores), 1)
            if numeric_scores
            else None
        )

        stored_evaluation = sub.get("evaluation")
        if not isinstance(stored_evaluation, dict):
            stored_evaluation = {}

        stored_originality = sub.get("originality")
        if not isinstance(stored_originality, dict):
            stored_originality = {}

        stored_team_details = sub.get("teamDetails")
        if not isinstance(stored_team_details, dict):
            stored_team_details = {}

        project_title = (
            sub.get("project")
            or sub.get("projectTitle")
            or sub.get("title")
        )

        results.append(
            {
                "id": sub_id,
                "projectTitle": project_title,
                "tagline": sub.get("tagline"),
                "desc": description,
                "category": sub.get("category"),
                "status": sub.get("status"),
                "version": sub.get("version"),
                "submittedAt": format_datetime(submitted_at),
                "deadline": format_datetime(deadline_raw),
                "isLate": is_late,
                "lateReason": sub.get("lateReason"),
                "postDeadlineActivity": sub.get("postDeadlineActivity"),
                "healthScore": sub.get("healthScore"),
                "riskLevel": sub.get("riskLevel"),
                "repoUrl": repo_url,
                "demoUrl": demo_url,
                "fileUrl": file_url,
                "deliverables": deliverables,
                "adminFeedback": sub.get("adminFeedback"),
                "changeIssues": sub.get("changeIssues", []),
                "investigationReason": sub.get("investigationReason"),
                "repoHealth": sub.get("repoHealth"),
                "originality": stored_originality or None,
                "aiReview": sub.get("aiReview"),
                "evaluation": {
                    "judgesAssigned": stored_evaluation.get("judgesAssigned"),
                    "judgesCompleted": (
                        stored_evaluation.get("judgesCompleted")
                        if stored_evaluation.get("judgesCompleted") is not None
                        else len(evaluation_docs)
                    ),
                    "averageScore": (
                        stored_evaluation.get("averageScore")
                        if stored_evaluation.get("averageScore") is not None
                        else average_score
                    ),
                    "conflictDetected": stored_evaluation.get("conflictDetected"),
                    "conflictMessage": stored_evaluation.get("conflictMessage"),
                },
                "rubric": sub.get("rubric"),
                "teamDetails": {
                    "name": (
                        (team or {}).get("teamName")
                        or (team or {}).get("name")
                        or stored_team_details.get("name")
                    ),
                    "college": (
                        (team or {}).get("college")
                        or (team or {}).get("institution")
                        or stored_team_details.get("college")
                    ),
                    "members": members_list,
                    "mentor": stored_team_details.get("mentor"),
                },
                "versions": sub.get("versions", []),
                "timeline": sub.get("timeline", []),
                "notes": sub.get("notes", []),
                "fileSecurity": sub.get("fileSecurity"),
                "hackathon": (
                    (hackathon or {}).get("title")
                    or sub.get("hackathonTitle")
                ),
            }
        )

    return results


@router.put("/{submission_id}/status")
async def update_sub_status(
    submission_id: str,
    status_update: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Update submission status for an admin or the owning organizer."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["admin", "superadmin", "organizer"]:
        raise HTTPException(status_code=403, detail="Not authorized.")

    new_status = status_update.get("status")
    if new_status not in ALLOWED_SUBMISSION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid submission status.")

    db = get_db()
    collection = db["submissions"]
    query = submission_query(submission_id)

    submission = await collection.find_one(query)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    if role == "organizer" and not await can_manage_submission(
        submission, current_user, db
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this submission.",
        )

    now = datetime.utcnow()
    reason = status_update.get("reason")
    update_doc = {
        "status": new_status,
        "reviewedAt": now,
    }

    if new_status == "Disqualified" and reason:
        update_doc["disqualificationReason"] = reason

    await collection.update_one(
        query,
        {
            "$set": update_doc,
            "$push": {
                "timeline": {
                    "date": now.strftime("%b %d, %Y %I:%M %p"),
                    "event": f"Status updated to {new_status}",
                }
            },
        },
    )

    team_id = str(submission.get("teamId", "") or "")

    if new_status == "Disqualified":
        if team_id:
            team_query = (
                {"_id": ObjectId(team_id)}
                if ObjectId.is_valid(team_id)
                else {"id": team_id}
            )
            await db["teams"].update_one(
                team_query,
                {
                    "$set": {
                        "status": "Disqualified",
                        "submissionStatus": "Disqualified",
                    }
                },
            )

        await db["disputes"].insert_one(
            {
                "type": "Disqualification",
                "submissionId": submission_id,
                "teamId": team_id or None,
                "reporter": current_user.get("email"),
                "details": reason,
                "decision": "Disqualified",
                "status": "Resolved",
                "createdAt": now,
            }
        )

        if team_id:
            await db["notifications"].insert_one(
                {
                    "title": "Submission Disqualified",
                    "message": (
                        "Your submission has been disqualified. "
                        f"Reason: {reason}" if reason
                        else "Your submission has been disqualified."
                    ),
                    "target_audience": "all",
                    "teamId": team_id,
                    "createdBy": str(
                        current_user.get("id")
                        or current_user.get("sub")
                        or ""
                    ),
                    "createdAt": now,
                    "readBy": [],
                }
            )

    await db["audit_logs"].insert_one(
        {
            "action": f"Submission Status: {new_status}",
            "details": f"Submission '{submission_id}' marked as {new_status}.",
            "category": "Submission",
            "color": (
                "emerald"
                if new_status in ["Approved", "Evaluated", "Shortlisted"]
                else "amber"
                if new_status == "Changes Requested"
                else "red"
                if new_status in ["Rejected", "Disqualified", "Flagged for Investigation"]
                else "neutral"
            ),
            "icon": "📄",
            "timestamp": now,
        }
    )

    return {
        "success": True,
        "status": new_status,
        "message": f"Submission status updated to {new_status}.",
    }


@router.post("/{submission_id}/request-changes")
async def request_submission_changes(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Request changes to an existing submission and notify its team."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required.")

    db = get_db()
    collection = db["submissions"]
    query = submission_query(submission_id)

    submission = await collection.find_one(query)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    message = payload.get("message") or "Please review the requested changes."
    issues = payload.get("issues", [])
    if not isinstance(issues, list):
        raise HTTPException(
            status_code=400,
            detail="The issues field must be a list.",
        )

    deadline = payload.get("deadline")
    now = datetime.utcnow()

    await collection.update_one(
        query,
        {
            "$set": {
                "status": "Changes Requested",
                "adminFeedback": message,
                "changeIssues": issues,
            },
            "$push": {
                "timeline": {
                    "date": now.strftime("%b %d, %Y %I:%M %p"),
                    "event": (
                        "Changes requested by admin: "
                        + (", ".join(str(issue) for issue in issues)
                           if issues else "Submission update requested")
                    ),
                }
            },
        },
    )

    team_id = submission.get("teamId")
    if team_id:
        notification_message = message
        if issues:
            notification_message += " Issues: " + ", ".join(
                str(issue) for issue in issues
            )
        if deadline:
            notification_message += f" Deadline: {deadline}"

        await db["notifications"].insert_one(
            {
                "title": "Submission Changes Requested",
                "message": notification_message,
                "target_audience": "all",
                "teamId": str(team_id),
                "createdBy": str(
                    current_user.get("id")
                    or current_user.get("sub")
                    or ""
                ),
                "createdAt": now,
                "readBy": [],
            }
        )

    return {
        "success": True,
        "message": "Change request recorded.",
    }


@router.post("/{submission_id}/flag-investigation")
async def flag_submission_investigation(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Flag an existing submission for investigation."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required.")

    db = get_db()
    collection = db["submissions"]
    query = submission_query(submission_id)

    submission = await collection.find_one(query)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    reason = payload.get("reason") or "Flagged for administrative investigation."
    now = datetime.utcnow()
    team_id = submission.get("teamId")

    await collection.update_one(
        query,
        {
            "$set": {
                "status": "Flagged for Investigation",
                "investigationReason": reason,
            },
            "$push": {
                "timeline": {
                    "date": now.strftime("%b %d, %Y %I:%M %p"),
                    "event": f"Flagged for investigation: {reason}",
                }
            },
        },
    )

    await db["disputes"].insert_one(
        {
            "type": "Submission Investigation",
            "submissionId": submission_id,
            "teamId": team_id,
            "reporter": current_user.get("email"),
            "details": reason,
            "status": "Open",
            "createdAt": now,
        }
    )

    return {
        "success": True,
        "message": "Submission flagged for investigation.",
    }


@router.post("/{submission_id}/add-note")
async def add_internal_admin_note(
    submission_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Add an internal note to an existing submission."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required.")

    note_text = payload.get("text")
    if not isinstance(note_text, str) or not note_text.strip():
        raise HTTPException(status_code=400, detail="Note text is required.")

    db = get_db()
    collection = db["submissions"]
    query = submission_query(submission_id)

    submission = await collection.find_one(query)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    note = {
        "author": current_user.get("name") or current_user.get("email"),
        "date": datetime.utcnow().strftime("%b %d, %Y %I:%M %p"),
        "text": note_text.strip(),
    }

    await collection.update_one(query, {"$push": {"notes": note}})
    return {"success": True, "note": note}


@router.post("/admin/bulk-action")
async def perform_bulk_submissions_action(
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Apply an allowed status to selected submissions."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required.")

    submission_ids = payload.get("submissionIds", [])
    action = payload.get("action")

    if not isinstance(submission_ids, list) or not submission_ids:
        raise HTTPException(status_code=400, detail="No submissions selected.")

    if action not in ALLOWED_SUBMISSION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid submission status.")

    object_ids = [
        ObjectId(item)
        for item in submission_ids
        if isinstance(item, str) and ObjectId.is_valid(item)
    ]
    string_ids = [
        item
        for item in submission_ids
        if isinstance(item, str) and not ObjectId.is_valid(item)
    ]

    clauses = []
    if object_ids:
        clauses.append({"_id": {"$in": object_ids}})
    if string_ids:
        clauses.append({"id": {"$in": string_ids}})

    if not clauses:
        raise HTTPException(
            status_code=400,
            detail="No valid submission IDs were provided.",
        )

    result = await get_submission_collection().update_many(
        {"$or": clauses},
        {
            "$set": {
                "status": action,
                "reviewedAt": datetime.utcnow(),
            }
        },
    )

    return {
        "success": True,
        "updatedCount": result.modified_count,
        "action": action,
    }


@router.get("/{submission_id}/ai-review")
async def get_submission_ai_review(
    submission_id: str,
    current_user: dict = Depends(with_auth),
):
    """Generate an AI review for an existing submission."""
    role = str(current_user.get("role", "")).lower()
    if role not in ["admin", "superadmin", "organizer", "judge"]:
        raise HTTPException(
            status_code=403,
            detail="Authorized review access required.",
        )

    db = get_db()
    query = submission_query(submission_id)
    submission = await db["submissions"].find_one(query)

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    if role == "organizer" and not await can_manage_submission(
        submission, current_user, db
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to review this submission.",
        )

    submission.pop("_id", None)
    review = await ai_service.review_project_submission(submission)

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
