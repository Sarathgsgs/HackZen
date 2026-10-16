from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from database import get_db
from core.dependencies import RequireRole
from services.ai_service import ai_service

router = APIRouter(prefix="/admin/disputes", tags=["Admin Disputes"])


class ResolveDisputeRequest(BaseModel):
    decision: str
    reason: str
    actions: List[str] = []
    notifyReporter: Optional[bool] = True
    notifyTeam: Optional[bool] = True
    notifyOrganizer: Optional[bool] = True


class AddNoteRequest(BaseModel):
    text: str
    isInternal: Optional[bool] = True


class AssignInvestigatorRequest(BaseModel):
    investigatorName: str
    investigatorEmail: str


class RequestInfoRequest(BaseModel):
    target: str = "Team"
    requestedItems: List[str] = []
    message: str = ""
    deadlineHours: int = 48


@router.get("")
@router.get("/")
@router.get("/all")
async def get_all_disputes(
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Fetch all dispute cases enriched with case assessments, evidence integrity, similarity scores, COI detection, and audit histories"""
    db = get_db()
    disputes = await db["disputes"].find().sort("createdAt", -1).to_list(100)

    result = []
    now = datetime.utcnow()
    for d in disputes:
        sla_deadline = d.get("slaDeadline")
        if isinstance(sla_deadline, datetime):
            diff_sec = (sla_deadline - now).total_seconds()
            if diff_sec <= 0:
                sla_text = "SLA EXCEEDED"
            else:
                rem_h = int(diff_sec // 3600)
                rem_m = int((diff_sec % 3600) // 60)
                sla_text = f"{rem_h}h {rem_m}m remaining"
        else:
            sla_text = "Unavailable"

        assessment = {**(d.get("assessment") or {}), "slaRemaining": sla_text}

        result.append(
            {
                "id": str(d["_id"]),
                "disputeCode": d.get(
                    "disputeCode", f"DSP-2026-{str(d['_id'])[-5:].upper()}"
                ),
                "type": d.get("type") or d.get("category"),
                "category": d.get("category"),
                "severity": d.get("severity"),
                "status": d.get("status"),
                "reporter": d.get("reporter"),
                "reportedTeam": d.get("reportedTeam"),
                "hackathonTitle": d.get("hackathonTitle"),
                "assessment": assessment,
                "similarityAnalysis": d.get("similarityAnalysis") or {},
                "evidence": d.get("evidence") or [],
                "evidenceIntegrity": d.get("evidenceIntegrity") or {},
                "investigationChecklist": d.get("investigationChecklist") or {},
                "coi": d.get("coi"),
                "assignedInvestigator": d.get("assignedInvestigator"),
                "timeline": d.get("timeline", []),
                "communications": d.get("communications", []),
                "appeal": d.get("appeal"),
            }
        )

    return {"success": True, "disputes": result}


@router.post("/{dispute_id}/assign")
async def assign_investigator(
    dispute_id: str,
    data: AssignInvestigatorRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    """Assign investigator & run Conflict of Interest check against team mentors/members"""
    db = get_db()
    query = (
        {"_id": ObjectId(dispute_id)}
        if ObjectId.is_valid(dispute_id)
        else {"disputeCode": dispute_id}
    )

    dispute_doc = await db["disputes"].find_one(query)
    team_name = (
        dispute_doc.get("reportedTeam", {}).get("name", "") if dispute_doc else ""
    )

    coi_flag = {
        "detected": False,
        "relationship": None,
        "message": "No conflict of interest detected.",
    }
    if team_name and data.investigatorEmail:
        team_doc = await db["teams"].find_one({"teamName": team_name})
        if team_doc:
            mentor_id = team_doc.get("mentorId")
            mentor_user = await db["users"].find_one({"email": data.investigatorEmail})
            if mentor_user and str(mentor_user.get("_id")) == str(mentor_id):
                coi_flag = {
                    "detected": True,
                    "relationship": "Assigned Team Mentor",
                    "message": f"Conflict of Interest Alert: {data.investigatorName} is assigned mentor for team {team_name}.",
                }

    assign_obj = {
        "name": data.investigatorName,
        "email": data.investigatorEmail,
        "assignedAt": datetime.utcnow().strftime("%b %d, %I:%M %p"),
    }

    new_timeline = {
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
        "event": f"Investigator assigned: {data.investigatorName} (COI: {'Detected' if coi_flag['detected'] else 'Clean'})",
    }

    await db["disputes"].update_one(
        query,
        {
            "$set": {
                "assignedInvestigator": assign_obj,
                "status": "Under Investigation",
                "coi": coi_flag,
            },
            "$push": {"timeline": new_timeline},
        },
    )

    return {
        "success": True,
        "message": f"Investigator {data.investigatorName} assigned to dispute.",
        "coi": coi_flag,
    }


@router.post("/{dispute_id}/request-info")
async def request_info_from_party(
    dispute_id: str,
    data: RequestInfoRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    """Send structured info request to reporter or team"""
    db = get_db()
    query = (
        {"_id": ObjectId(dispute_id)}
        if ObjectId.is_valid(dispute_id)
        else {"disputeCode": dispute_id}
    )

    info_log = {
        "author": current_user.get("name", "Admin"),
        "role": f"Information Request to {data.target}",
        "text": f"Request: {', '.join(data.requestedItems)}. Message: {data.message}. Deadline: {data.deadlineHours}h.",
        "isInternal": False,
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
    }

    await db["disputes"].update_one(
        query,
        {
            "$set": {"status": "Waiting for Response"},
            "$push": {
                "communications": info_log,
                "timeline": {
                    "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
                    "event": f"Information requested from {data.target}",
                },
            },
        },
    )

    return {"success": True, "message": "Information request dispatched."}


@router.put("/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    data: ResolveDisputeRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    """Record final decision, resolution actions, mandatory reason, and audit trail"""
    db = get_db()
    query = (
        {"_id": ObjectId(dispute_id)}
        if ObjectId.is_valid(dispute_id)
        else {"disputeCode": dispute_id}
    )

    dispute = await db["disputes"].find_one(query)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    resolution_data = {
        "decision": data.decision,
        "reason": data.reason,
        "actionsTaken": data.actions,
        "resolvedBy": current_user.get("name", "Admin"),
        "resolvedAt": datetime.utcnow().strftime("%b %d, %Y %I:%M %p"),
    }

    await db["disputes"].update_one(
        query,
        {
            "$set": {
                "status": "Resolved",
                "resolution": resolution_data,
                "investigationChecklist.finalDecisionRecorded": True,
                "appeal": {
                    "eligible": True,
                    "windowHours": 48,
                    "status": "48-Hour Appeal Window Active",
                },
            },
            "$push": {
                "timeline": {
                    "event": f"Final Decision Recorded: {data.decision}",
                    "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
                }
            },
        },
    )

    await db["audit_logs"].insert_one(
        {
            "action": f"Dispute Resolved: {data.decision}",
            "category": "Disputes",
            "details": f"Dispute {dispute_id} resolved with decision '{data.decision}'. Actions: {', '.join(data.actions)}. Reason: {data.reason}",
            "adminName": current_user.get("name", "Admin"),
            "timestamp": datetime.utcnow(),
        }
    )

    return {
        "success": True,
        "message": "Dispute case resolved and audit trail recorded.",
    }


@router.post("/{dispute_id}/notes")
async def add_internal_note(
    dispute_id: str,
    data: AddNoteRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    db = get_db()
    query = (
        {"_id": ObjectId(dispute_id)}
        if ObjectId.is_valid(dispute_id)
        else {"disputeCode": dispute_id}
    )

    note = {
        "author": current_user.get("name", "Admin"),
        "role": "Internal Note" if data.isInternal else "Public Message",
        "text": data.text,
        "isInternal": data.isInternal,
        "date": datetime.utcnow().strftime("%b %d, %I:%M %p"),
    }

    await db["disputes"].update_one(query, {"$push": {"communications": note}})
    return {"success": True, "note": note}


@router.post("/{dispute_id}/ai-assessment")
async def get_dispute_ai_assessment(
    dispute_id: str, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Generate Gemini AI investigative assessment for a dispute case"""
    db = get_db()
    query = (
        {"_id": ObjectId(dispute_id)}
        if ObjectId.is_valid(dispute_id)
        else {"$or": [{"disputeCode": dispute_id}, {"id": dispute_id}]}
    )

    dispute = await db["disputes"].find_one(query)
    if not dispute and ObjectId.is_valid(dispute_id):
        dispute = await db["disputes"].find_one(
            {"$or": [{"disputeCode": dispute_id}, {"id": dispute_id}]}
        )

    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    assessment = await ai_service.analyze_dispute_case(dispute)
    return {"success": True, "assessment": assessment}
