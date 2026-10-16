from fastapi import APIRouter, Body, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import os
import re
from core.dependencies import with_auth
from database import get_db
from bson import ObjectId
from schemas.mentor_dashboard import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    FeedbackCreate,
    FeedbackSubmit,
    FeedbackResponse,
    MeetingCreate,
    MeetingResponse,
    ProgressResponse,
    PerformanceMetrics,
    ReportResponse,
)
from services.mentor_dashboard_service import MentorDashboardService
from services.file_upload import file_upload_service

router = APIRouter()

CRITERIA_KEYS = [
    "projectUnderstanding",
    "technicalApproach",
    "innovation",
    "feasibility",
    "presentationReadiness",
    "marketPotential",
    "userExperience",
    "collaboration",
]

KEY_MAPPINGS = {
    "project_understanding": "projectUnderstanding",
    "projectunderstanding": "projectUnderstanding",
    "projectUnderstanding": "projectUnderstanding",
    "technical_approach": "technicalApproach",
    "technicalapproach": "technicalApproach",
    "technicalApproach": "technicalApproach",
    "innovation": "innovation",
    "feasibility": "feasibility",
    "presentation_readiness": "presentationReadiness",
    "presentationreadiness": "presentationReadiness",
    "presentationReadiness": "presentationReadiness",
    "market_potential": "marketPotential",
    "marketpotential": "marketPotential",
    "marketPotential": "marketPotential",
    "user_experience": "userExperience",
    "userexperience": "userExperience",
    "userExperience": "userExperience",
    "collaboration": "collaboration",
}


def normalize_criteria_ratings(ratings: Optional[dict]) -> dict:
    if not isinstance(ratings, dict):
        return {}
    normalized = {}
    for k, v in ratings.items():
        canonical = KEY_MAPPINGS.get(k, k)
        normalized[canonical] = v
    return normalized


def format_file_size(size_bytes: int) -> str:
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
    elif size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    elif size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"


def format_material_doc(doc: dict) -> dict:
    uploaded_by = doc.get("uploadedBy")
    if not isinstance(uploaded_by, dict):
        uploaded_by = {
            "id": str(doc.get("uploadedById") or doc.get("uploadedBy") or ""),
            "name": doc.get("uploadedByName") or "Mentor",
            "email": doc.get("uploadedByEmail", ""),
        }

    return {
        "id": str(doc["_id"]),
        "_id": str(doc["_id"]),
        "name": doc.get("originalName") or doc.get("name", "Untitled"),
        "originalName": doc.get("originalName") or doc.get("name", "Untitled"),
        "teamId": doc.get("teamId"),
        "teamName": doc.get("teamName", "Assigned Team"),
        "type": doc.get("type") or "file",
        "mimeType": doc.get("mimeType", "application/octet-stream"),
        "size": doc.get("size", 0),
        "sizeFormatted": format_file_size(doc.get("size", 0)),
        "category": doc.get("category", "General"),
        "description": doc.get("description", ""),
        "storagePath": doc.get("storagePath", ""),
        "uploadedBy": uploaded_by,
        "uploadedByName": uploaded_by.get("name", "Mentor"),
        "uploadedAt": (doc.get("createdAt") or datetime.utcnow()).isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt", "")),
        "createdAt": (doc.get("createdAt") or datetime.utcnow()).isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt", "")),
        "updatedAt": (doc.get("updatedAt") or datetime.utcnow()).isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt", "")),
    }


def format_feedback_doc(doc: dict) -> dict:
    ratings = doc.get("criteriaRatings") or {}
    overall_score = doc.get("overallScore")
    if overall_score is None and ratings:
        valid_vals = [v for v in ratings.values() if isinstance(v, (int, float)) and v > 0]
        if valid_vals:
            overall_score = round(sum(valid_vals) / len(valid_vals), 1)

    return {
        "id": str(doc["_id"]),
        "_id": str(doc["_id"]),
        "feedbackId": doc.get("feedbackId") or str(doc["_id"]),
        "mentorId": doc.get("mentorId"),
        "mentorName": doc.get("mentorName") or "Mentor",
        "teamId": doc.get("teamId"),
        "teamName": doc.get("teamName", "Assigned Team"),
        "status": doc.get("status", "submitted"),
        "type": doc.get("type", "general"),
        "feedbackType": doc.get("feedbackType") or doc.get("title") or "General",
        "title": doc.get("title") or doc.get("feedbackType") or "Evaluation Feedback",
        "content": doc.get("content") or doc.get("guidance") or doc.get("comments") or "",
        "guidance": doc.get("guidance") or doc.get("content") or doc.get("comments") or "",
        "rating": doc.get("rating"),
        "criteriaRatings": ratings,
        "overallScore": overall_score,
        "submittedAt": (doc.get("submittedAt") or doc.get("createdAt")).isoformat() if isinstance(doc.get("submittedAt") or doc.get("createdAt"), datetime) else str(doc.get("submittedAt") or doc.get("createdAt", "")),
        "createdAt": (doc.get("createdAt") or datetime.utcnow()).isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt", "")),
        "updatedAt": (doc.get("updatedAt") or datetime.utcnow()).isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt", "")),
    }


# ============= TEAM MATERIALS ENDPOINTS =============
@router.get("/materials")
async def get_team_materials(
    search: Optional[str] = Query(None),
    teamId: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    fileType: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(with_auth),
):
    """List team materials for the mentor's assigned teams with search, filter, and pagination."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can access materials")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    teams = await db["teams"].find({"$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]}).to_list(100)
    assigned_team_ids = [str(team["_id"]) for team in teams]

    if not assigned_team_ids:
        return {
            "success": True,
            "data": [],
            "pagination": {"page": page, "limit": limit, "total": 0, "totalPages": 0},
        }

    if teamId:
        if teamId not in assigned_team_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized for this team's materials")
        query_teams = [teamId]
    else:
        query_teams = assigned_team_ids

    filter_query: Dict[str, Any] = {"teamId": {"$in": query_teams}}

    if search and search.strip():
        term = re.escape(search.strip())
        filter_query["$or"] = [
            {"originalName": {"$regex": term, "$options": "i"}},
            {"category": {"$regex": term, "$options": "i"}},
            {"type": {"$regex": term, "$options": "i"}},
            {"teamName": {"$regex": term, "$options": "i"}},
        ]

    if category and category != "All":
        filter_query["category"] = category

    if fileType and fileType != "All":
        filter_query["type"] = fileType.lower()

    total = await db["teamMaterials"].count_documents(filter_query)
    skip = (page - 1) * limit
    materials = await db["teamMaterials"].find(filter_query).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)

    formatted_list = [format_material_doc(m) for m in materials]
    total_pages = (total + limit - 1) // limit if total > 0 else 0

    return {
        "success": True,
        "data": formatted_list,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
        },
    }


@router.get("/materials/recent")
async def get_recent_materials(current_user: dict = Depends(with_auth)):
    """Get the 5 most recently uploaded materials across mentor's assigned teams."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can access materials")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    teams = await db["teams"].find({"$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]}).to_list(100)
    assigned_team_ids = [str(team["_id"]) for team in teams]

    if not assigned_team_ids:
        return {"success": True, "data": []}

    materials = await db["teamMaterials"].find({"teamId": {"$in": assigned_team_ids}}).sort("createdAt", -1).limit(5).to_list(5)
    return {"success": True, "data": [format_material_doc(m) for m in materials]}


@router.get("/materials/storage")
async def get_materials_storage(current_user: dict = Depends(with_auth)):
    """Calculate actual storage usage across mentor's assigned teams."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can access materials")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    teams = await db["teams"].find({"$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]}).to_list(100)
    assigned_team_ids = [str(team["_id"]) for team in teams]

    total_storage_bytes = 10 * 1024 * 1024 * 1024  # 10 GB limit

    if not assigned_team_ids:
        return {
            "success": True,
            "data": {
                "usedBytes": 0,
                "usedFormatted": "0 MB",
                "totalBytes": total_storage_bytes,
                "totalFormatted": "10 GB",
                "usagePercentage": 0.0,
                "fileCount": 0,
            },
        }

    pipeline = [
        {"$match": {"teamId": {"$in": assigned_team_ids}}},
        {"$group": {"_id": None, "usedBytes": {"$sum": "$size"}, "fileCount": {"$sum": 1}}},
    ]
    agg_result = await db["teamMaterials"].aggregate(pipeline).to_list(1)
    used_bytes = agg_result[0]["usedBytes"] if agg_result else 0
    file_count = agg_result[0]["fileCount"] if agg_result else 0

    percentage = round((used_bytes / total_storage_bytes) * 100, 2)

    return {
        "success": True,
        "data": {
            "usedBytes": used_bytes,
            "usedFormatted": format_file_size(used_bytes),
            "totalBytes": total_storage_bytes,
            "totalFormatted": "10 GB",
            "usagePercentage": percentage,
            "fileCount": file_count,
        },
    }


@router.post("/materials", status_code=status.HTTP_201_CREATED)
async def upload_team_material(
    file: UploadFile = File(...),
    teamId: Optional[str] = Form(None),
    team_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: dict = Depends(with_auth),
):
    """Upload a real file for an assigned team with storage on disk and database metadata persistence."""
    target_team_id = teamId or team_id
    if not target_team_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="teamId is required")

    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can upload team materials")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(target_team_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID")

    team = await db["teams"].find_one({"_id": ObjectId(target_team_id), "$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]})
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to upload materials for this team")

    # Perform real file upload and validation
    upload_info = await file_upload_service.save_team_material(file, target_team_id)

    now = datetime.utcnow()
    material_doc = {
        "teamId": target_team_id,
        "teamName": team.get("teamName", "Assigned team"),
        "originalName": upload_info["originalName"],
        "fileName": upload_info["storedName"],
        "storagePath": upload_info["storagePath"],
        "type": upload_info["type"],
        "mimeType": upload_info["mimeType"],
        "size": upload_info["size"],
        "category": category or upload_info["defaultCategory"],
        "description": description or "",
        "uploadedBy": {
            "id": mentor_id,
            "name": current_user.get("name") or "Mentor",
            "email": current_user.get("email"),
        },
        "uploadedByName": current_user.get("name") or "Mentor",
        "createdAt": now,
        "updatedAt": now,
    }

    insert_result = await db["teamMaterials"].insert_one(material_doc)
    material_doc["_id"] = insert_result.inserted_id

    return {"success": True, "data": format_material_doc(material_doc)}


@router.get("/materials/{material_id}")
async def get_team_material_by_id(material_id: str, current_user: dict = Depends(with_auth)):
    """Get metadata for a single material file."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can access materials")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(material_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid material ID")

    material = await db["teamMaterials"].find_one({"_id": ObjectId(material_id)})
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    team = await db["teams"].find_one({"_id": ObjectId(material["teamId"]), "$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]})
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to view this file")

    return {"success": True, "data": format_material_doc(material)}


@router.get("/materials/{material_id}/download")
async def download_team_material(material_id: str, current_user: dict = Depends(with_auth)):
    """Download material file securely with authorization check."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can download materials")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(material_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid material ID")

    material = await db["teamMaterials"].find_one({"_id": ObjectId(material_id)})
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    team = await db["teams"].find_one({"_id": ObjectId(material["teamId"]), "$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]})
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to access this file")

    storage_path = material.get("storagePath")
    full_path = file_upload_service.get_full_path(storage_path)

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical file not found on storage")

    safe_filename = material.get("originalName", "download")
    return FileResponse(
        path=str(full_path),
        filename=safe_filename,
        media_type=material.get("mimeType", "application/octet-stream"),
    )


@router.delete("/materials/{material_id}")
async def delete_team_material(material_id: str, current_user: dict = Depends(with_auth)):
    """Delete a team material file from disk storage and database."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can delete materials")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(material_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid material ID")

    material = await db["teamMaterials"].find_one({"_id": ObjectId(material_id)})
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    team = await db["teams"].find_one({"_id": ObjectId(material["teamId"]), "$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]})
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to delete this file")

    storage_path = material.get("storagePath")
    if storage_path:
        file_upload_service.delete_file(storage_path)

    await db["teamMaterials"].delete_one({"_id": ObjectId(material_id)})
    return {"success": True, "message": "File deleted successfully"}


# ============= FEEDBACK ENDPOINTS =============
@router.get("/feedback/teams")
async def get_feedback_teams(current_user: dict = Depends(with_auth)):
    """Return all feedback-workspace data from MongoDB in one request."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can view feedback")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    teams = await db["teams"].find({"$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]}).to_list(100)
    result = []
    for team in teams:
        team_id = str(team["_id"])
        memberships = await db["teamMembers"].find({"teamId": team_id}).to_list(100)
        members = []
        for membership in memberships:
            user_id = membership.get("userId", "")
            user = await db["users"].find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
            members.append({
                "id": str(membership["_id"]),
                "userId": user_id,
                "name": (user or {}).get("name") or membership.get("name") or "Member",
                "role": membership.get("role") or "Member",
            })

        progress = await db["progress"].find_one({"teamId": team_id}) or {}
        feedbacks = await db["feedback"].find({"teamId": team_id, "mentorId": mentor_id}).sort("createdAt", -1).to_list(100)
        draft = await db["feedback"].find_one({"teamId": team_id, "mentorId": mentor_id, "status": "draft"})

        result.append({
            "id": team_id,
            "name": team.get("teamName") or "Assigned team",
            "domain": team.get("domain") or "General",
            "memberCount": len(members),
            "members": members,
            "stage": progress.get("currentStage") or "Exploration",
            "progress": int(progress.get("percentage", 0) or 0),
            "progressHistory": progress.get("progressHistory") or [],
            "feedback": [format_feedback_doc(item) for item in feedbacks],
            "draft": format_feedback_doc(draft) if draft else None,
        })
    return {"success": True, "data": result}


@router.get("/feedback")
async def get_all_feedback(
    teamId: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(with_auth),
):
    """List all feedbacks created by the mentor with optional filters."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can view feedback")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    teams = await db["teams"].find({"$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]}).to_list(100)
    assigned_team_ids = [str(team["_id"]) for team in teams]

    if not assigned_team_ids:
        return {"success": True, "data": []}

    query: Dict[str, Any] = {"mentorId": mentor_id, "teamId": {"$in": assigned_team_ids}}
    if teamId:
        if teamId not in assigned_team_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized for this team")
        query["teamId"] = teamId

    if status_filter:
        query["status"] = status_filter.lower()

    feedbacks = await db["feedback"].find(query).sort("createdAt", -1).to_list(100)
    return {"success": True, "data": [format_feedback_doc(f) for f in feedbacks]}


@router.get("/feedback/team/{team_id}")
async def get_team_feedback(team_id: str, current_user: dict = Depends(with_auth)):
    """Get feedback history and active draft for an assigned team."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can view feedback")
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid team ID")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    team = await db["teams"].find_one({"_id": ObjectId(team_id), "$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]})
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Team is not assigned to you")

    feedbacks = await db["feedback"].find({"teamId": team_id, "mentorId": mentor_id}).sort("createdAt", -1).to_list(100)
    draft = await db["feedback"].find_one({"teamId": team_id, "mentorId": mentor_id, "status": "draft"})

    formatted_feedbacks = [format_feedback_doc(f) for f in feedbacks]
    formatted_draft = format_feedback_doc(draft) if draft else None

    return {
        "success": True,
        "count": len(feedbacks),
        "data": formatted_feedbacks,
        "history": formatted_feedbacks,
        "draft": formatted_draft,
    }


@router.get("/feedback/{feedback_id}")
async def get_feedback_by_id(feedback_id: str, current_user: dict = Depends(with_auth)):
    """Get single feedback record."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can view feedback")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")

    if not ObjectId.is_valid(feedback_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid feedback ID")

    feedback = await db["feedback"].find_one({"_id": ObjectId(feedback_id), "mentorId": mentor_id})
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    return {"success": True, "data": format_feedback_doc(feedback)}


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def create_or_save_feedback(
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Save draft or submit new feedback with evaluation criteria ratings and written guidance."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can create feedback")

    team_id = payload.get("teamId") or payload.get("team_id")
    if not team_id or not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Valid teamId is required")

    mentor_id = current_user.get("id") or current_user.get("sub")
    db = get_db()
    team = await db["teams"].find_one({"_id": ObjectId(team_id), "$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]})
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Feedback is allowed only for your assigned teams")

    feedback_status = payload.get("status", "draft").lower()
    if feedback_status not in {"draft", "submitted"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Status must be 'draft' or 'submitted'")

    raw_ratings = payload.get("criteriaRatings") or payload.get("criteria_ratings") or payload.get("ratings") or {}
    ratings = normalize_criteria_ratings(raw_ratings)
    guidance = payload.get("guidance") or payload.get("content") or payload.get("message") or ""
    confidential_notes = payload.get("confidentialNotes") or payload.get("confidential_notes") or ""
    feedback_type = payload.get("type") or payload.get("feedbackType") or "General"
    title = payload.get("title") or f"{feedback_type} Feedback"

    # Validation
    if feedback_status == "submitted":
        if not guidance or len(guidance.strip()) < 5:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Written guidance of at least 5 characters is required.")

        if not ratings:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Evaluation criteria ratings are required.")

        missing_criteria = []
        for key in CRITERIA_KEYS:
            val = ratings.get(key)
            if val is None or not isinstance(val, (int, float)) or val < 1 or val > 5:
                missing_criteria.append(key)

        if missing_criteria:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"All 8 evaluation criteria ratings (1-5) are required for submission. Missing or invalid: {', '.join(missing_criteria)}",
            )
    else:
        # For drafts, validate any provided ratings are in range 1-5
        for k, v in ratings.items():
            if v is not None and (not isinstance(v, (int, float)) or v < 1 or v > 5):
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Rating for '{k}' must be between 1 and 5.")

    now = datetime.utcnow()
    valid_scores = [v for v in ratings.values() if isinstance(v, (int, float)) and v > 0]
    overall_score = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else payload.get("rating")

    mentor_user = await db["users"].find_one({"_id": ObjectId(mentor_id)}) if ObjectId.is_valid(mentor_id) else None
    mentor_name = (mentor_user or {}).get("name") or current_user.get("name") or "Mentor"

    doc_data = {
        "mentorId": mentor_id,
        "mentorName": mentor_name,
        "teamId": team_id,
        "teamName": team.get("teamName", "Assigned Team"),
        "hackathonId": str(team.get("hackathonId", "")),
        "status": feedback_status,
        "type": feedback_type.lower().replace(" ", "_"),
        "feedbackType": feedback_type,
        "title": title,
        "content": guidance,
        "guidance": guidance,
        "comments": guidance,
        "confidentialNotes": confidential_notes,
        "criteriaRatings": ratings,
        "overallScore": overall_score,
        "rating": int(overall_score) if overall_score is not None else 4,
        "updatedAt": now,
    }

    if feedback_status == "submitted":
        doc_data["submittedAt"] = now
        # If there was an active draft for this team, upgrade it or insert submitted
        draft = await db["feedback"].find_one({"teamId": team_id, "mentorId": mentor_id, "status": "draft"})
        if draft:
            await db["feedback"].update_one({"_id": draft["_id"]}, {"$set": doc_data})
            doc_data["_id"] = draft["_id"]
        else:
            doc_data["createdAt"] = now
            res = await db["feedback"].insert_one(doc_data)
            doc_data["_id"] = res.inserted_id

        # Notify team members
        members = await db["teamMembers"].find({"teamId": team_id}, {"userId": 1}).to_list(100)
        if members:
            notifications = [{
                "userId": member["userId"],
                "hackathonId": team.get("hackathonId"),
                "type": "mentor_feedback",
                "message": f"Your mentor shared evaluation feedback for {team.get('teamName', 'your team')}",
                "read": False,
                "createdAt": now,
            } for member in members if member.get("userId")]
            if notifications:
                await db["notifications"].insert_many(notifications)
    else:
        # Draft save: upsert existing draft for (mentorId, teamId)
        draft = await db["feedback"].find_one({"teamId": team_id, "mentorId": mentor_id, "status": "draft"})
        if draft:
            await db["feedback"].update_one({"_id": draft["_id"]}, {"$set": doc_data})
            doc_data["_id"] = draft["_id"]
            doc_data["createdAt"] = draft.get("createdAt", now)
        else:
            doc_data["createdAt"] = now
            res = await db["feedback"].insert_one(doc_data)
            doc_data["_id"] = res.inserted_id

    return {"success": True, "data": format_feedback_doc(doc_data)}


@router.patch("/feedback/{feedback_id}")
async def update_feedback_draft(
    feedback_id: str,
    payload: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Update an existing draft feedback."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can update feedback")

    if not ObjectId.is_valid(feedback_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid feedback ID")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    feedback = await db["feedback"].find_one({"_id": ObjectId(feedback_id), "mentorId": mentor_id})
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    if feedback.get("status") == "submitted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submitted feedback is final and cannot be edited as draft")

    raw_ratings = payload.get("criteriaRatings") or payload.get("criteria_ratings") or payload.get("ratings")
    ratings = normalize_criteria_ratings(raw_ratings) if raw_ratings is not None else None
    guidance = payload.get("guidance") or payload.get("content") or payload.get("message")
    confidential_notes = payload.get("confidentialNotes") or payload.get("confidential_notes")
    feedback_type = payload.get("type") or payload.get("feedbackType")

    updates: Dict[str, Any] = {"updatedAt": datetime.utcnow()}
    if ratings is not None:
        for k, v in ratings.items():
            if v is not None and (not isinstance(v, (int, float)) or v < 1 or v > 5):
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Rating for '{k}' must be between 1 and 5.")
        updates["criteriaRatings"] = ratings
        valid_scores = [v for v in ratings.values() if isinstance(v, (int, float)) and v > 0]
        if valid_scores:
            updates["overallScore"] = round(sum(valid_scores) / len(valid_scores), 1)

    if guidance is not None:
        updates["content"] = guidance
        updates["guidance"] = guidance
        updates["comments"] = guidance

    if confidential_notes is not None:
        updates["confidentialNotes"] = confidential_notes

    if feedback_type is not None:
        updates["type"] = feedback_type.lower().replace(" ", "_")
        updates["feedbackType"] = feedback_type

    await db["feedback"].update_one({"_id": ObjectId(feedback_id)}, {"$set": updates})
    updated_doc = await db["feedback"].find_one({"_id": ObjectId(feedback_id)})
    return {"success": True, "data": format_feedback_doc(updated_doc)}


@router.post("/feedback/{feedback_id}/submit")
async def submit_feedback_draft(
    feedback_id: str,
    payload: Optional[dict] = Body(None),
    current_user: dict = Depends(with_auth),
):
    """Submit a draft feedback record with full 8-criteria validation."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can submit feedback")

    if not ObjectId.is_valid(feedback_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid feedback ID")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    feedback = await db["feedback"].find_one({"_id": ObjectId(feedback_id), "mentorId": mentor_id})
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    team_id = feedback.get("teamId")
    team = await db["teams"].find_one({"_id": ObjectId(team_id), "$or": [{"mentorId": mentor_id}, {"mentor_id": mentor_id}, {"mentor": mentor_id}]}) if ObjectId.is_valid(team_id) else None
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are no longer assigned to this team")

    payload_dict = payload or {}
    raw_ratings = payload_dict.get("criteriaRatings") or payload_dict.get("criteria_ratings") or payload_dict.get("ratings") or feedback.get("criteriaRatings") or {}
    ratings = normalize_criteria_ratings(raw_ratings)
    guidance = payload_dict.get("guidance") or payload_dict.get("content") or feedback.get("guidance") or feedback.get("content") or ""
    confidential_notes = payload_dict.get("confidentialNotes") or payload_dict.get("confidential_notes") or feedback.get("confidentialNotes") or ""

    if not guidance or len(guidance.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Written guidance of at least 5 characters is required.")

    missing_criteria = []
    for key in CRITERIA_KEYS:
        val = ratings.get(key)
        if val is None or not isinstance(val, (int, float)) or val < 1 or val > 5:
            missing_criteria.append(key)

    if missing_criteria:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"All 8 evaluation criteria ratings (1-5) are required for submission. Missing or invalid: {', '.join(missing_criteria)}",
        )

    now = datetime.utcnow()
    valid_scores = [v for v in ratings.values() if isinstance(v, (int, float)) and v > 0]
    overall_score = round(sum(valid_scores) / len(valid_scores), 1)

    updates = {
        "status": "submitted",
        "criteriaRatings": ratings,
        "content": guidance,
        "guidance": guidance,
        "comments": guidance,
        "confidentialNotes": confidential_notes,
        "overallScore": overall_score,
        "rating": int(overall_score),
        "submittedAt": now,
        "updatedAt": now,
    }

    await db["feedback"].update_one({"_id": ObjectId(feedback_id)}, {"$set": updates})

    # Notify team members
    members = await db["teamMembers"].find({"teamId": team_id}, {"userId": 1}).to_list(100)
    if members:
        notifications = [{
            "userId": member["userId"],
            "hackathonId": team.get("hackathonId"),
            "type": "mentor_feedback",
            "message": f"Your mentor submitted feedback evaluation for {team.get('teamName', 'your team')}",
            "read": False,
            "createdAt": now,
        } for member in members if member.get("userId")]
        if notifications:
            await db["notifications"].insert_many(notifications)

    updated_doc = await db["feedback"].find_one({"_id": ObjectId(feedback_id)})
    return {"success": True, "data": format_feedback_doc(updated_doc)}


@router.get("/feedback/student/{student_id}")
async def get_student_feedback(
    student_id: str,
    current_user: dict = Depends(with_auth),
):
    """Get all feedback for a student"""
    try:
        if current_user.get("role") != "mentor":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can view feedback")
        mentor_id = current_user["sub"]
        db = get_db()
        assigned_teams = await db["teams"].find({"mentorId": mentor_id}, {"_id": 1}).to_list(100)
        team_ids = [str(team["_id"]) for team in assigned_teams]
        membership = await db["teamMembers"].find_one({"userId": student_id, "teamId": {"$in": team_ids}})
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is not in one of your assigned teams")
        feedbacks = await db["feedback"].find({"studentId": student_id, "mentorId": mentor_id, "teamId": {"$in": team_ids}}).sort("createdAt", -1).to_list(100)
        for feedback in feedbacks:
            feedback["_id"] = str(feedback["_id"])
        return {"success": True, "count": len(feedbacks), "data": feedbacks}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============= DASHBOARD OVERVIEW =============
@router.get("/dashboard")
async def get_mentor_dashboard(current_user: dict = Depends(with_auth)):
    """Return the mentor's current work in a dashboard-friendly, real-data shape."""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can view dashboard")

    db = get_db()
    mentor_id = current_user.get("id") or current_user.get("sub")
    teams = await db["teams"].find({"mentorId": mentor_id}).to_list(100)
    team_ids = [str(team["_id"]) for team in teams]
    now = datetime.utcnow()
    dashboard_teams = []
    active_members = []
    today_activity = []

    for team in teams:
        team_id = str(team["_id"])
        progress = await db["progress"].find_one({"teamId": team_id}) or {}
        stage_name = progress.get("currentStage") or "Not started"
        stage_id = progress.get("currentStageId")
        stage = None
        if stage_id and ObjectId.is_valid(stage_id):
            stage = await db["stages"].find_one({"_id": ObjectId(stage_id)})
            stage_name = (stage or {}).get("stageName") or (stage or {}).get("name") or stage_name
        hackathon_name = None
        hackathon_id = team.get("hackathonId")
        if hackathon_id and ObjectId.is_valid(hackathon_id):
            hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
            hackathon_name = (hackathon or {}).get("title")

        progress_id = str(progress.get("_id", ""))
        milestones = []
        if stage_id:
            milestones = await db["milestones"].find({"stageId": stage_id}).to_list(100)
        milestone_ids = [str(item["_id"]) for item in milestones]
        completed_milestones = 0
        completed_milestone_ids = set()
        if progress_id and milestone_ids:
            completed_records = await db["milestoneProgress"].find({
                "progressId": progress_id,
                "milestoneId": {"$in": milestone_ids},
                "completed": True,
            }).to_list(100)
            completed_milestone_ids = {record.get("milestoneId") for record in completed_records}
            completed_milestones = len(completed_milestone_ids)

        features = [{
            "id": str(milestone["_id"]),
            "name": milestone.get("title") or milestone.get("milestoneName") or milestone.get("name") or "Untitled milestone",
            "progress": 100 if str(milestone["_id"]) in completed_milestone_ids else 0,
            "status": "Completed" if str(milestone["_id"]) in completed_milestone_ids else "Not Started",
            "stage": stage_name,
        } for milestone in milestones]

        progress_history = progress.get("progressHistory", [])
        has_tracked_activity = bool(progress_history) or completed_milestones > 0
        last_updated = progress.get("lastUpdated")
        inactive_days = (now - last_updated).days if isinstance(last_updated, datetime) else None
        percentage = int(progress.get("percentage", 0))
        overdue_stage = bool(stage and isinstance(stage.get("endDate"), datetime) and stage["endDate"] < now)
        risk = "on-track"
        risk_reason = None
        if overdue_stage and percentage < 100:
            risk, risk_reason = "high", "Current stage has passed its deadline"
        elif percentage < 40:
            risk = "needs-attention"
            risk_reason = "Progress is below 40%"
        elif has_tracked_activity and inactive_days is not None and inactive_days >= 3:
            risk, risk_reason = "needs-attention", "No recent progress update"
        memberships = await db["teamMembers"].find({"teamId": team_id}).to_list(100)
        team_members = []
        active_count = 0
        for membership in memberships:
            member_id = membership.get("userId", "")
            member_user = await db["users"].find_one({"_id": ObjectId(member_id)}) if ObjectId.is_valid(member_id) else None
            last_active = (member_user or {}).get("lastActive")
            age_seconds = (now - last_active).total_seconds() if isinstance(last_active, datetime) else None
            presence = "Active" if age_seconds is not None and age_seconds <= 300 else "Idle" if age_seconds is not None and age_seconds <= 1800 else "Offline"
            if presence == "Active":
                active_count += 1
            completed_tasks = await db["tasks"].count_documents({"teamId": team_id, "studentId": member_id, "status": "completed"})
            member_item = {"id": member_id, "name": (member_user or {}).get("name") or membership.get("name") or "Team member", "role": membership.get("role") or "Member", "status": presence, "lastActive": last_active, "tasksCompleted": completed_tasks, "teamId": team_id, "teamName": team.get("teamName")}
            team_members.append(member_item)
            if presence != "Offline":
                active_members.append(member_item)
        last_activity = last_updated
        for point in progress_history:
            timestamp = point.get("updatedAt") if isinstance(point, dict) else None
            if isinstance(timestamp, datetime):
                today_activity.append({"id": f"progress-{team_id}-{timestamp.isoformat()}", "teamId": team_id, "teamName": team.get("teamName"), "description": f"{team.get('teamName', 'Team')} progress updated to {point.get('percentage', percentage)}%", "timestamp": timestamp, "type": "progress"})
        dashboard_teams.append({
            "id": team_id,
            "team": team.get("teamName"),
            "project": team.get("project") or hackathon_name,
            "progress": percentage,
            "progressHistory": progress.get("progressHistory", []),
            "stage": stage_name,
            "status": progress.get("status", "not-started").replace("-", " ").title(),
            "members": len(team_members), "activeMembers": active_count, "memberDetails": team_members,
            "milestones": {"completed": completed_milestones, "total": len(milestones)},
            "features": features,
            "stageEndDate": (stage or {}).get("endDate"),
            "lastUpdated": last_updated,
            "lastActivity": last_activity,
            "risk": risk,
            "riskReason": risk_reason,
        })

    pending_reviews = await db["submissions"].count_documents({"teamId": {"$in": team_ids}, "status": {"$regex": "^pending$", "$options": "i"}}) if team_ids else 0
    pending_checkpoints = await db["tasks"].count_documents({"mentorId": mentor_id, "status": {"$in": ["pending", "blocked"]}})
    recent_submissions = await db["submissions"].find({"teamId": {"$in": team_ids}}).sort("submittedAt", -1).to_list(5) if team_ids else []
    team_names = {str(team["_id"]): team.get("teamName", "Unnamed team") for team in teams}
    recent_reviews = [{
        "id": str(item["_id"]),
        "teamId": item.get("teamId"),
        "teamName": team_names.get(item.get("teamId"), "Unnamed team"),
        "title": item.get("title") or item.get("project") or "Stage submission",
        "project": item.get("project", "Untitled project"),
        "description": item.get("desc") or item.get("description"),
        "status": item.get("status", "Pending"),
        "submittedAt": item.get("submittedAt"),
        "fileUrl": item.get("fileUrl"),
    } for item in recent_submissions]

    pending_review_records = await db["submissions"].find({
        "teamId": {"$in": team_ids}, "status": {"$regex": "^pending$", "$options": "i"}
    }).sort("submittedAt", -1).to_list(10) if team_ids else []
    pending_review_queue = [{
        "id": str(item["_id"]),
        "teamId": item.get("teamId"),
        "teamName": team_names.get(item.get("teamId"), "Unnamed team"),
        "title": item.get("title") or item.get("project") or "Stage submission",
        "submittedAt": item.get("submittedAt"),
        "status": item.get("status", "Pending"),
    } for item in pending_review_records]

    action_records = await db["tasks"].find({
        "mentorId": mentor_id, "status": {"$in": ["pending", "blocked"]}
    }).sort("deadline", 1).to_list(10)
    action_queue = [{
        "id": str(item["_id"]),
        "teamId": item.get("teamId"),
        "teamName": team_names.get(item.get("teamId"), "Unnamed team"),
        "title": item.get("title", "Untitled action"),
        "description": item.get("description"),
        "deadline": item.get("deadline"),
        "priority": item.get("priority", "medium"),
        "status": item.get("status", "pending"),
    } for item in action_records]

    completed_tasks = await db["tasks"].find({"teamId": {"$in": team_ids}, "status": "completed"}).sort("updatedAt", -1).to_list(20) if team_ids else []
    for task in completed_tasks:
        timestamp = task.get("updatedAt") or task.get("completedAt")
        if isinstance(timestamp, datetime):
            today_activity.append({"id": f"task-{task['_id']}", "teamId": task.get("teamId"), "teamName": team_names.get(task.get("teamId"), "Assigned team"), "description": f"Task completed: {task.get('title', 'Untitled task')}", "timestamp": timestamp, "type": "task"})

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_activity = [item for item in today_activity if item["timestamp"] >= today_start]
    today_activity.sort(key=lambda item: item["timestamp"], reverse=True)
    meetings = await db["meetings"].find({"mentorId": mentor_id, "startTime": {"$gte": now}}).sort("startTime", 1).to_list(5)

    mentor_requests = await db["mentorRequests"].find({"mentorId": mentor_id}).sort("createdAt", -1).to_list(6)
    request_team_ids = [item.get("teamId") for item in mentor_requests if ObjectId.is_valid(item.get("teamId", ""))]
    request_teams = await db["teams"].find({"_id": {"$in": [ObjectId(t_id) for t_id in request_team_ids]}}).to_list(100) if request_team_ids else []
    request_team_map = {str(team["_id"]): team for team in request_teams}

    def request_item(item):
        team = request_team_map.get(item.get("teamId"), {})
        return {
            "id": str(item["_id"]),
            "teamId": item.get("teamId"),
            "teamName": team.get("teamName", "Unknown team"),
            "track": team.get("domain") or "General",
            "status": item.get("status", "pending"),
            "message": item.get("message", ""),
            "createdAt": item.get("createdAt"),
        }

    insight = None
    slowed = next((team for team in dashboard_teams if team["risk"] != "on-track"), None)
    if slowed:
        insight = f"{slowed['team']}'s progress is {slowed['progress']}% in {slowed['stage']}. Consider reviewing their current integration work."

    return {"success": True, "data": {
        "teams": dashboard_teams,
        "mentor": {"name": current_user.get("name") or "Mentor", "avatar": current_user.get("avatar") or current_user.get("profileImage")},
        "summary": {
            "mentorshipRequests": await db["mentorRequests"].count_documents({"mentorId": mentor_id, "status": "pending"}),
            "activeTeams": len(dashboard_teams),
            "pendingFeedback": pending_reviews,
            "completedMentorships": sum(1 for team in dashboard_teams if team["progress"] >= 100 or team["status"].lower() == "completed"),
            "membersActive": len(active_members),
            "overallProgress": round(sum(team["progress"] for team in dashboard_teams) / len(dashboard_teams)) if dashboard_teams else 0,
            "pendingReviews": pending_reviews,
        },
        "activeMembers": active_members,
        "todayActivity": today_activity[:20],
        "requests": [request_item(item) for item in mentor_requests],
        "upcomingMeetings": [{"id": str(item["_id"]), "title": item.get("title"), "startTime": item.get("startTime"), "endTime": item.get("endTime"), "teamId": item.get("teamId"), "teamName": team_names.get(item.get("teamId"), "Unnamed team"), "location": item.get("location"), "meetingLink": item.get("meetingLink"), "status": item.get("status", "scheduled")} for item in meetings],
        "pendingReviews": pending_reviews,
        "pendingCheckpoints": pending_checkpoints,
        "pendingReviewQueue": pending_review_queue,
        "actionQueue": action_queue,
        "recentReviews": recent_reviews,
        "attentionTeams": [team for team in dashboard_teams if team["risk"] != "on-track"],
        "aiInsight": insight,
    }}


# ============= TASK ASSIGNMENT ENDPOINTS =============
@router.post("/tasks", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(with_auth),
):
    """Create a new task for a student"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can create tasks",
            )
        
        db = get_db()
        if not ObjectId.is_valid(task_data.teamId):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid team ID")
        team = await db["teams"].find_one({"_id": ObjectId(task_data.teamId), "mentorId": current_user["sub"]})
        member = await db["teamMembers"].find_one({"teamId": task_data.teamId, "userId": task_data.studentId})
        if not team or not member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tasks can only be assigned to members of your teams")
        result = await MentorDashboardService.create_task(task_data, current_user["sub"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/tasks", response_model=dict)
async def get_mentor_tasks(
    student_id: Optional[str] = Query(None),
    current_user: dict = Depends(with_auth),
):
    """Get all tasks assigned by mentor, optionally filtered by student"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can view tasks",
            )
        
        tasks = await MentorDashboardService.get_mentor_tasks(current_user["sub"], student_id)
        return {"success": True, "count": len(tasks), "data": tasks}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: dict = Depends(with_auth),
):
    """Update task status and progress"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can update tasks",
            )
        
        result = await MentorDashboardService.update_task_status(task_id, task_update, current_user["sub"])
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============= MEETING SCHEDULER ENDPOINTS =============
@router.post("/meetings", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    meeting_data: MeetingCreate,
    current_user: dict = Depends(with_auth),
):
    """Create a mentoring meeting/session"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can create meetings",
            )
        
        result = await MentorDashboardService.create_meeting(meeting_data, current_user["sub"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except (ValueError, LookupError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/meetings")
async def get_mentor_meetings(
    upcoming_only: bool = Query(True),
    current_user: dict = Depends(with_auth),
):
    """Get all meetings scheduled by mentor"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can view meetings",
            )
        
        meetings = await MentorDashboardService.get_mentor_meetings(current_user["sub"], upcoming_only)
        return {"success": True, "count": len(meetings), "data": meetings}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============= PROGRESS TRACKING ENDPOINTS =============
@router.get("/progress/student/{student_id}")
async def get_student_progress(
    student_id: str,
    current_user: dict = Depends(with_auth),
):
    """Get student progress metrics"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can view progress",
            )
        
        progress = await MentorDashboardService.get_student_progress(current_user["sub"], student_id)
        return {"success": True, "data": progress}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/students")
async def get_assigned_students(
    current_user: dict = Depends(with_auth),
):
    """Get all students assigned to mentor"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can view assigned students",
            )
        
        students = await MentorDashboardService.get_all_assigned_students(current_user["sub"])
        return {"success": True, "count": len(students), "data": students}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============= PERFORMANCE ANALYTICS ENDPOINTS =============
@router.get("/performance/student/{student_id}")
async def get_performance_metrics(
    student_id: str,
    current_user: dict = Depends(with_auth),
):
    """Get performance metrics for a student"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can view performance metrics",
            )
        
        metrics = await MentorDashboardService.calculate_performance_metrics(
            current_user["sub"],
            student_id,
        )
        return {"success": True, "data": metrics}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============= REPORT GENERATION ENDPOINTS =============
@router.get("/reports/student/{student_id}")
async def generate_student_report(
    student_id: str,
    report_type: str = Query("weekly", enum=["weekly", "monthly", "final"]),
    current_user: dict = Depends(with_auth),
):
    """Generate a comprehensive student progress report"""
    try:
        if current_user["role"] != "mentor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only mentors can generate reports",
            )
        
        report = await MentorDashboardService.generate_student_report(
            current_user["sub"],
            student_id,
            report_type,
        )
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============= DASHBOARD OVERVIEW =============
@router.get("/overview")
async def get_dashboard_overview(current_user: dict = Depends(with_auth)):
    """Get dashboard overview with all key metrics"""
    if current_user.get("role") != "mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can view dashboard",
        )

    try:
        
        students = await MentorDashboardService.get_all_assigned_students(current_user["sub"])
        meetings = await MentorDashboardService.get_mentor_meetings(current_user["sub"], upcoming_only=True)
        tasks = await MentorDashboardService.get_mentor_tasks(current_user["sub"])
        pending_tasks = [task for task in tasks if task.get("status") == "pending"]

        return {"success": True, "data": {
            "totalStudents": len(students),
            "upcomingMeetings": len(meetings),
            "pendingTasks": len(pending_tasks),
            "students": students,
            "meetings": meetings[:5],
            "tasks": pending_tasks[:5],
        }}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============= TEAM MENTORSHIP WORKSPACE ENDPOINTS =============
@router.get("/teams/{team_id}/mentorship")
async def get_team_mentorship_details(team_id: str, current_user: dict = Depends(with_auth)):
    """Get full mentorship workspace details for a specific team"""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can view mentorship workspace")

    db = get_db()
    if not ObjectId.is_valid(team_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    team = await db["teams"].find_one({"_id": ObjectId(team_id), "mentorId": current_user["sub"]})
    if not team:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this team")
    team_name = team.get("teamName", "Unnamed team")
    t_id = str(team["_id"])

    progress = await db["progress"].find_one({"teamId": t_id}) or {}
    percentage = int(progress.get("percentage", 0))
    stage_name = progress.get("currentStage", "Not started")

    members = []
    team_members = await db["teamMembers"].find({"teamId": t_id}).to_list(100)
    for tm in team_members:
        user = await db["users"].find_one({"_id": ObjectId(tm["userId"])}) if ObjectId.is_valid(tm.get("userId", "")) else None
        members.append({
            "id": str(tm["_id"]),
            "userId": tm.get("userId"),
            "name": (user or {}).get("name") or tm.get("name"),
            "role": tm.get("role"),
            "email": (user or {}).get("email"),
            "avatar": ((user or {}).get("name") or tm.get("name") or "?")[:2].upper(),
        })

    submissions = await db["submissions"].find({"teamId": t_id}).sort("submittedAt", -1).to_list(20)
    formatted_submissions = [{
        "id": str(s["_id"]),
        "title": s.get("title") or s.get("project") or "Stage Submission",
        "stage": s.get("stage") or stage_name,
        "type": s.get("type") or "PDF",
        "size": s.get("size") or "5.4 MB",
        "submittedAt": s.get("submittedAt", datetime.utcnow()).strftime("%Y-%m-%d %H:%M") if isinstance(s.get("submittedAt"), datetime) else str(s.get("submittedAt", "")),
        "status": s.get("status", "Pending"),
        "score": s.get("score"),
        "comments": s.get("comments"),
    } for s in submissions]

    return {
        "success": True,
        "data": {
            "id": t_id,
            "name": team_name,
            "domain": team.get("domain", ""),
            "description": team.get("description", "No project description has been added yet."),
            "stage": stage_name,
            "progress": percentage,
            "progressHistory": progress.get("progressHistory", []),
            "memberCount": len(members),
            "members": members,
            "submissions": formatted_submissions,
        },
    }


@router.post("/teams/{team_id}/submissions/{submission_id}/review")
async def review_submission(
    team_id: str,
    submission_id: str,
    review_data: dict = Body(...),
    current_user: dict = Depends(with_auth),
):
    """Review and score a team submission"""
    if current_user.get("role") != "mentor":
        raise HTTPException(status_code=403, detail="Only mentors can evaluate submissions")

    db = get_db()
    if not ObjectId.is_valid(team_id) or not ObjectId.is_valid(submission_id):
        raise HTTPException(status_code=404, detail="Submission not found")
    team = await db["teams"].find_one({"_id": ObjectId(team_id), "mentorId": current_user["sub"]})
    if not team:
        raise HTTPException(status_code=403, detail="You are not assigned to this team")
    status_val = review_data.get("status", "approved").lower()
    if status_val not in {"approved", "rejected", "needs_changes"}:
        raise HTTPException(status_code=422, detail="Invalid review status")
    score_val = review_data.get("score")
    comments_val = review_data.get("comments", "")

    result = await db["submissions"].update_one(
        {"_id": ObjectId(submission_id), "teamId": team_id},
        {"$set": {
            "status": status_val,
            "score": score_val,
            "comments": comments_val,
            "reviewedAt": datetime.utcnow(),
            "reviewedBy": current_user.get("id") or current_user.get("sub"),
        }},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"success": True, "message": f"Submission {status_val} successfully"}
