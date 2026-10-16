from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.evaluation import EvaluationCreate, EvaluationResponse

router = APIRouter()


def get_evaluation_collection():
    return get_db()["evaluations"]


DEFAULT_CRITERIA = [
    {
        "id": "innovation",
        "label": "Innovation & Originality",
        "description": "Is the idea unique and novel?",
        "weight": 10,
        "minScore": 0,
        "maxScore": 10,
    },
    {
        "id": "technical",
        "label": "Technical Implementation",
        "description": "Code quality and complexity.",
        "weight": 10,
        "minScore": 0,
        "maxScore": 10,
    },
    {
        "id": "design",
        "label": "Design & User Experience",
        "description": "UI/UX and ease of use.",
        "weight": 10,
        "minScore": 0,
        "maxScore": 10,
    },
    {
        "id": "presentation",
        "label": "Presentation Quality",
        "description": "Clarity of the pitch/demo.",
        "weight": 10,
        "minScore": 0,
        "maxScore": 10,
    },
    {
        "id": "feasibility",
        "label": "Business Feasibility",
        "description": "Market potential and viability.",
        "weight": 10,
        "minScore": 0,
        "maxScore": 10,
    },
]


@router.get("/criteria")
async def get_evaluation_criteria(current_user: dict = Depends(with_auth)):
    """Get evaluation criteria saved by this organizer."""
    db = get_db()
    user_id = str(current_user.get("id") or current_user.get("sub") or "")
    doc = await db["evaluationCriteria"].find_one({"organizerId": user_id})
    if not doc:
        return DEFAULT_CRITERIA
    return doc.get("criteria", DEFAULT_CRITERIA)


@router.put("/criteria")
async def save_evaluation_criteria(
    criteria: List[Dict[str, Any]] = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Save evaluation criteria for the current organizer."""
    db = get_db()
    user_id = str(current_user.get("id") or current_user.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    await db["evaluationCriteria"].update_one(
        {"organizerId": user_id},
        {
            "$set": {
                "organizerId": user_id,
                "criteria": criteria,
                "updatedAt": datetime.utcnow(),
            }
        },
        upsert=True,
    )
    return criteria


@router.post(
    "/",
    response_model=EvaluationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_evaluation(
    eval_data: EvaluationCreate,
    current_user: dict = Depends(RequireRole(["mentor", "admin", "organizer"])),
):
    """Evaluate a project submission."""
    db = get_db()
    collection = get_evaluation_collection()

    user_id = current_user.get("id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token",
        )

    eval_dict = eval_data.model_dump(by_alias=True)
    eval_dict["judgeId"] = str(user_id)

    if eval_dict.get("submissionId"):
        eval_dict["submissionId"] = str(eval_dict["submissionId"])

    eval_dict["evaluatedAt"] = datetime.utcnow()

    if not eval_dict.get("totalScore") and eval_data.scores:
        eval_dict["totalScore"] = sum(eval_data.scores.values())

    submission_id = eval_dict.get("submissionId")
    team_id = eval_dict.get("teamId")

    if not submission_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="submissionId is required",
        )

    if not ObjectId.is_valid(submission_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid submissionId format",
        )

    submission = await db["submissions"].find_one(
        {"_id": ObjectId(submission_id)}
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if str(submission.get("teamId")) != str(team_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="submissionId does not belong to the supplied teamId",
        )

    result = await collection.insert_one(eval_dict)
    eval_dict["_id"] = str(result.inserted_id)

    await db["submissions"].update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"status": "Evaluated"}},
    )

    return EvaluationResponse(**eval_dict)


@router.get(
    "/submission/{submission_id}",
    response_model=List[EvaluationResponse],
)
async def get_submission_evaluations(
    submission_id: str,
    current_user: dict = Depends(with_auth),
):
    """Get evaluations only when the user can access the submission."""
    db = get_db()
    collection = get_evaluation_collection()

    if not ObjectId.is_valid(submission_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid submissionId format",
        )

    submission = await db["submissions"].find_one(
        {"_id": ObjectId(submission_id)}
    )
    if not submission:
        return []

    team_id = str(submission.get("teamId"))
    user_id = str(current_user.get("id") or current_user.get("sub") or "")
    role = current_user.get("role")

    if role in ["admin", "organizer"]:
        allowed = True
    elif role == "mentor":
        team = (
            await db["teams"].find_one({"_id": ObjectId(team_id)})
            if ObjectId.is_valid(team_id)
            else None
        )
        allowed = bool(team and str(team.get("mentorId")) == user_id)
    elif role == "student":
        allowed = bool(
            await db["teamMembers"].find_one(
                {"teamId": team_id, "userId": user_id}
            )
        )
    else:
        allowed = False

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view evaluations for this submission",
        )

    evals = await collection.find(
        {"submissionId": submission_id}
    ).to_list(length=100)

    for evaluation in evals:
        evaluation["_id"] = str(evaluation["_id"])

    return [EvaluationResponse(**evaluation) for evaluation in evals]


@router.get(
    "/leaderboard/{hackathon_id}",
    response_model=List[Dict[str, Any]],
)
async def get_leaderboard(hackathon_id: str):
    """Calculate the leaderboard for a hackathon."""
    db = get_db()

    settings = await db["settings"].find_one(
        {"key": "global_config"}
    ) or {}

    if not bool(settings.get("publicLeaderboard", True)):
        return []

    pipeline = [
        {"$match": {"hackathonId": hackathon_id}},
        {
            "$group": {
                "_id": "$submissionId",
                "averageScore": {"$avg": "$totalScore"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"averageScore": -1}},
    ]

    results = await db["evaluations"].aggregate(pipeline).to_list(100)
    leaderboard = []

    for index, result in enumerate(results):
        submission_id = result.get("_id")
        if not submission_id or not ObjectId.is_valid(str(submission_id)):
            continue

        submission = await db["submissions"].find_one(
            {"_id": ObjectId(str(submission_id))}
        )
        if not submission:
            continue

        team_id = str(submission.get("teamId", ""))
        team = (
            await db["teams"].find_one({"_id": ObjectId(team_id)})
            if ObjectId.is_valid(team_id)
            else None
        )
        if not team:
            continue

        leaderboard.append(
            {
                "rank": index + 1,
                "teamId": team_id,
                "teamName": team.get("teamName", "Team"),
                "score": round(result.get("averageScore") or 0, 2),
                "maxScore": 100,
                "submissionId": str(submission_id),
            }
        )

    return leaderboard
