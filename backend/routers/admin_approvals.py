from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from database import get_db
from core.dependencies import RequireRole
from services.ai_service import ai_service

router = APIRouter(prefix="/admin/approvals", tags=["Admin Approvals"])


class ApprovalRequest(BaseModel):
    status: str
    message: Optional[str] = None
    reason: Optional[str] = None
    sections: Optional[List[str]] = None
    feedbackNote: Optional[str] = None
    feedbackSections: Optional[List[str]] = None
    rejectionReason: Optional[str] = None


@router.put("/organizers/{app_id}")
async def process_organizer_approval(
    app_id: str,
    data: ApprovalRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    db = get_db()
    query = {"_id": ObjectId(app_id)} if ObjectId.is_valid(app_id) else {"_id": app_id}

    application = await db["applications"].find_one(query)
    if not application:
        application = await db["users"].find_one(query)
        if not application:
            raise HTTPException(
                status_code=404, detail="Application or user record not found"
            )
        user_id_str = str(application["_id"])
    else:
        user_id_str = str(application.get("userId", application["_id"]))

    await db["applications"].update_one(
        query,
        {"$set": {"status": data.status, "updatedAt": datetime.utcnow()}},
        upsert=False,
    )

    user_query = (
        {"_id": ObjectId(user_id_str)}
        if ObjectId.is_valid(user_id_str)
        else {"_id": user_id_str}
    )

    if data.status == "Approved":
        await db["users"].update_one(
            user_query,
            {
                "$set": {
                    "role": "ORGANIZER",
                    "isVerified": True,
                    "status": "Active",
                    "updatedAt": datetime.utcnow(),
                }
            },
        )
    elif data.status == "Rejected":
        await db["users"].update_one(
            user_query,
            {
                "$set": {
                    "status": "Rejected",
                    "rejectionReason": data.reason or data.message,
                    "updatedAt": datetime.utcnow(),
                }
            },
        )
    elif data.status == "Suspended":
        await db["users"].update_one(
            user_query,
            {
                "$set": {
                    "status": "Suspended",
                    "suspensionReason": data.reason or data.message,
                    "updatedAt": datetime.utcnow(),
                }
            },
        )
    elif data.status in ["Needs Changes", "needs_changes", "Change Requested"]:
        await db["users"].update_one(
            user_query,
            {
                "$set": {
                    "status": "Needs Changes",
                    "changeRequest": data.message,
                    "changeSections": data.sections or [],
                    "updatedAt": datetime.utcnow(),
                }
            },
        )
    elif data.status == "Pending":
        await db["users"].update_one(
            user_query, {"$set": {"status": "Pending", "updatedAt": datetime.utcnow()}}
        )

    notif_msg = (
        data.message or f"Your organizer application has been marked as {data.status}."
    )
    await db["notifications"].insert_one(
        {
            "userId": user_id_str,
            "type": "APPLICATION_UPDATE",
            "title": f"Organizer Application {data.status}",
            "message": notif_msg,
            "read": False,
            "createdAt": datetime.utcnow(),
        }
    )

    await db["audit_logs"].insert_one(
        {
            "action": f"Organizer {data.status}",
            "module": "Approvals",
            "details": f"Processed application {app_id} -> {data.status}.",
            "adminName": current_user.get("name", "Admin"),
            "createdAt": datetime.utcnow(),
        }
    )

    return {
        "success": True,
        "message": f"Organizer application marked as {data.status}.",
    }


@router.get("/hackathons")
async def get_admin_hackathons_approvals(
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """
    Fetches all hackathon proposals for admin evaluation, matching the full 3-step creation flow.
    """
    db = get_db()
    cursor = db["hackathons"].find({}).sort("createdAt", -1)
    hackathons = await cursor.to_list(100)

    formatted = []
    for h in hackathons:
        h_id = str(h["_id"])
        org_id = str(h.get("organizerId", ""))

        # Organizer details
        org_user = None
        if org_id and ObjectId.is_valid(org_id):
            org_user = await db["users"].find_one(
                {"_id": ObjectId(org_id)}, {"password": 0}
            )
        elif org_id:
            org_user = await db["users"].find_one({"_id": org_id}, {"password": 0})

        org_profile = None
        if org_id:
            org_profile = await db["organizers"].find_one({"userId": org_id})

        org_name = (
            h.get("organizerName")
            or (org_user.get("name") if org_user else None)
            or (
                org_user.get("email", "").split("@")[0].capitalize()
                if org_user
                else "Platform Organizer"
            )
        )
        org_org = (
            h.get("organization")
            or (org_profile.get("institutionName") if org_profile else None)
            or (org_user.get("organization") if org_user else None)
            or (org_user.get("college") if org_user else "HackZen Partner Org")
        )
        org_email = org_user.get("email", "") if org_user else ""

        # Aggregated stats
        participants_count = await db["applications"].count_documents(
            {"hackathonId": h_id}
        )
        teams_count = (
            await db["teams"].count_documents({"hackathonId": h_id})
            if "teams" in await db.list_collection_names()
            else 0
        )
        submissions_count = (
            await db["submissions"].count_documents({"hackathonId": h_id})
            if "submissions" in await db.list_collection_names()
            else 0
        )
        past_events = (
            await db["hackathons"].count_documents({"organizerId": org_id})
            if org_id
            else 1
        )

        # Dates formatting
        def fmt_date(d):
            if isinstance(d, datetime):
                return d.strftime("%b %d, %Y")
            elif isinstance(d, str) and d:
                try:
                    dt = datetime.fromisoformat(d.replace("Z", "+00:00"))
                    return dt.strftime("%b %d, %Y")
                except Exception:
                    return d[:10]
            return "TBD"

        h_start = h.get("hackathonStart") or h.get("startDate")
        h_end = h.get("hackathonEnd") or h.get("endDate")
        reg_start = h.get("registrationStart") or h_start
        reg_end = h.get("registrationEnd") or h_end

        # Tracks / Themes normalization
        themes = h.get("themes", [])
        if not isinstance(themes, list):
            themes = [str(themes)] if themes else ["General"]

        tracks = h.get("tracks", [])
        if not tracks or not isinstance(tracks, list):
            tracks = [
                {
                    "id": i + 1,
                    "title": t,
                    "description": f"Projects focused on {t} innovations and problem solving.",
                }
                for i, t in enumerate(themes)
            ]

        # Status normalization
        raw_status = str(h.get("status", "Pending"))
        if raw_status.lower() in ["draft", "needs revision", "needs_revision"]:
            status_val = "Needs Revision"
        elif raw_status.lower() in ["approved", "active", "live"]:
            status_val = "Approved"
        elif raw_status.lower() in ["rejected"]:
            status_val = "Rejected"
        else:
            status_val = "Pending"

        # Rules normalization
        rules = h.get("rules", [])
        if isinstance(rules, str):
            rules = [r.strip() for r in rules.split("\n") if r.strip()]
        elif not isinstance(rules, list) or len(rules) == 0:
            rules = [
                "All code and assets submitted must be developed during the hackathon period.",
                "Teams must provide a public GitHub repository link and demo documentation.",
                "Originality and strict adherence to intellectual property guidelines are required.",
            ]

        formatted.append(
            {
                "id": h_id,
                "title": h.get("title", "Untitled Hackathon"),
                "tagline": h.get("tagline")
                or h.get("description", "")[:120]
                or "Build innovative solutions for real-world challenges",
                "description": h.get(
                    "description", "No detailed description provided by organizer."
                ),
                "problemStatement": h.get(
                    "problemStatement",
                    "Develop creative, scalable software/hardware architectures addressing platform challenges.",
                ),
                "themes": themes,
                "tracks": tracks,
                "minTeamSize": h.get("minTeamSize", 1),
                "maxTeamSize": h.get("maxTeamSize", 4),
                "isPublic": h.get("isPublic", True),
                "autoApprove": h.get("autoApprove", False),
                "rules": rules,
                "posterUrl": h.get("posterUrl", None),
                "templateUrl": h.get("templateUrl", None),
                "status": status_val,
                "feedbackNote": h.get("feedbackNote", ""),
                "feedbackSections": h.get("feedbackSections", []),
                "rejectionReason": h.get("rejectionReason", ""),
                "dates": {
                    "start": fmt_date(h_start),
                    "end": fmt_date(h_end),
                    "regStart": fmt_date(reg_start),
                    "regEnd": fmt_date(reg_end),
                    "rawStart": str(h_start),
                    "rawEnd": str(h_end),
                },
                "organizer": {
                    "id": org_id,
                    "name": org_name,
                    "org": org_org,
                    "email": org_email,
                    "pastEvents": past_events,
                    "isVerified": (
                        org_user.get("isVerified", True) if org_user else True
                    ),
                },
                "stats": {
                    "participants": participants_count,
                    "teams": teams_count,
                    "submissions": submissions_count,
                },
                "createdAt": fmt_date(h.get("createdAt", datetime.utcnow())),
            }
        )

    return {"success": True, "hackathons": formatted}


@router.put("/hackathons/{hackathon_id}")
async def process_hackathon_approval(
    hackathon_id: str,
    data: ApprovalRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    db = get_db()
    query = (
        {"_id": ObjectId(hackathon_id)}
        if ObjectId.is_valid(hackathon_id)
        else {"_id": hackathon_id}
    )

    hackathon = await db["hackathons"].find_one(query)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    update_payload = {"status": data.status, "updatedAt": datetime.utcnow()}

    if data.status == "Approved":
        update_payload["isApproved"] = True
        update_payload["approvedAt"] = datetime.utcnow()
    elif data.status in ["Needs Revision", "Draft", "needs_revision"]:
        update_payload["status"] = "Needs Revision"
        update_payload["feedbackNote"] = (
            data.feedbackNote or data.message or "Please revise requested sections."
        )
        update_payload["feedbackSections"] = (
            data.feedbackSections or data.sections or []
        )
    elif data.status == "Rejected":
        update_payload["status"] = "Rejected"
        update_payload["rejectionReason"] = (
            data.rejectionReason
            or data.reason
            or data.message
            or "Rejected by administrator."
        )
    elif data.status == "Pending":
        update_payload["status"] = "Pending"
    elif data.status == "Active":
        update_payload["status"] = "Active"

    await db["hackathons"].update_one(query, {"$set": update_payload})

    organizer_id = str(hackathon.get("organizerId", ""))
    if organizer_id:
        notif_msg = (
            data.message
            or data.feedbackNote
            or f"Your hackathon '{hackathon.get('title', 'Event')}' is now marked as {data.status}."
        )
        await db["notifications"].insert_one(
            {
                "userId": organizer_id,
                "hackathonId": str(hackathon["_id"]),
                "type": "HACKATHON_UPDATE",
                "title": f"Hackathon Status: {data.status}",
                "message": notif_msg,
                "read": False,
                "createdAt": datetime.utcnow(),
            }
        )

    await db["audit_logs"].insert_one(
        {
            "action": f"Hackathon {data.status}",
            "module": "Hackathon Approvals",
            "details": f"Hackathon '{hackathon.get('title', hackathon_id)}' marked as {data.status}.",
            "adminName": current_user.get("name", "Admin"),
            "createdAt": datetime.utcnow(),
        }
    )

    return {"success": True, "message": f"Hackathon updated to {data.status}"}


@router.get("/hackathons/{hackathon_id}/ai-review")
async def get_hackathon_ai_review(
    hackathon_id: str,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    """Generate dynamic AI proposal feasibility, clarity & compliance review for hackathon approval"""
    db = get_db()
    query = (
        {"_id": ObjectId(hackathon_id)}
        if ObjectId.is_valid(hackathon_id)
        else {"_id": hackathon_id}
    )

    hackathon = await db["hackathons"].find_one(query)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    # Organizer resolution
    org_id = str(hackathon.get("organizerId") or hackathon.get("creatorId") or "")
    org_user = None
    if org_id and ObjectId.is_valid(org_id):
        org_user = await db["users"].find_one(
            {"_id": ObjectId(org_id)}, {"password": 0}
        )
    if not org_user and org_id:
        org_user = await db["users"].find_one({"_id": org_id}, {"password": 0})
    if not org_user and hackathon.get("organizerEmail"):
        org_user = await db["users"].find_one(
            {"email": hackathon["organizerEmail"]}, {"password": 0}
        )

    # Normalized tracks and themes
    themes = hackathon.get("themes") or []
    if isinstance(themes, str):
        themes = [t.strip() for t in themes.split(",") if t.strip()]
    elif not isinstance(themes, list):
        themes = [str(themes)]

    tracks = hackathon.get("tracks") or []
    if isinstance(tracks, list):
        track_names = [
            t.get("title", str(t)) if isinstance(t, dict) else str(t) for t in tracks
        ]
    else:
        track_names = [str(tracks)] if tracks else []

    rules = hackathon.get("rules") or []
    if isinstance(rules, str):
        rules = [r.strip() for r in rules.split("\n") if r.strip()]
    elif not isinstance(rules, list):
        rules = [str(rules)] if rules else []

    desc_val = hackathon.get("description") or ""
    prob_val = hackathon.get("problemStatement") or desc_val

    enriched_hackathon = {
        "id": str(hackathon.get("_id", hackathon_id)),
        "title": hackathon.get("title", ""),
        "tagline": hackathon.get("tagline", ""),
        "description": desc_val,
        "problemStatement": prob_val,
        "themes": themes,
        "tracks": track_names or themes,
        "rules": rules,
        "minTeamSize": hackathon.get("minTeamSize", 1),
        "maxTeamSize": hackathon.get("maxTeamSize", 4),
        "guidelines": hackathon.get("guidelines")
        or hackathon.get("participantGuidelines")
        or "",
        "judgingCriteria": hackathon.get("judgingCriteria")
        or hackathon.get("evaluationCriteria")
        or "",
        "prizePool": hackathon.get("prizePool") or hackathon.get("prizes") or "",
        "organizer": {
            "name": (org_user.get("name") if org_user else None)
            or hackathon.get("organizerName", "Platform Organizer"),
            "org": (
                org_user.get("organization") or org_user.get("college")
                if org_user
                else None
            )
            or hackathon.get("organization", "Educational Institution"),
            "email": (org_user.get("email") if org_user else None)
            or hackathon.get("organizerEmail", ""),
            "pastEvents": (
                await db["hackathons"].count_documents(
                    {
                        "$or": [
                            {"organizerId": org_id},
                            {"organizerEmail": hackathon.get("organizerEmail", "")},
                        ]
                    }
                )
                if org_id
                else 0
            ),
        },
        "dates": {
            "start": str(
                hackathon.get("hackathonStart") or hackathon.get("startDate") or ""
            ),
            "end": str(hackathon.get("hackathonEnd") or hackathon.get("endDate") or ""),
        },
        "hackathonStart": str(
            hackathon.get("hackathonStart") or hackathon.get("startDate") or ""
        ),
        "hackathonEnd": str(
            hackathon.get("hackathonEnd") or hackathon.get("endDate") or ""
        ),
        "registrationStart": str(hackathon.get("registrationStart") or ""),
        "registrationEnd": str(hackathon.get("registrationEnd") or ""),
    }

    review = await ai_service.review_hackathon_proposal(enriched_hackathon)
    return {"success": True, "review": review}


@router.post("/hackathons/{hackathon_id}/reminder")
async def send_hackathon_revision_reminder(
    hackathon_id: str,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    """Dispatch high-priority revision reminder to organizer for pending hackathon change request"""
    db = get_db()
    query = (
        {"_id": ObjectId(hackathon_id)}
        if ObjectId.is_valid(hackathon_id)
        else {"_id": hackathon_id}
    )
    hackathon = await db["hackathons"].find_one(query)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    organizer_id = str(hackathon.get("organizerId", ""))
    hack_title = hackathon.get("title", "Hackathon Event")

    if organizer_id:
        await db["notifications"].insert_one(
            {
                "userId": organizer_id,
                "target_audience": "organizer",
                "type": "HACKATHON_REVISION_REMINDER",
                "title": f"Action Required: Revision Reminder for '{hack_title}'",
                "message": f"Administrator reminder: Your hackathon proposal '{hack_title}' currently has pending change requests awaiting your update.",
                "hackathonId": str(hackathon["_id"]),
                "read": False,
                "priority": "high",
                "createdAt": datetime.utcnow(),
            }
        )

    await db["audit_logs"].insert_one(
        {
            "action": "Revision Reminder Sent",
            "module": "Hackathon Approvals",
            "details": f"Revision reminder sent to organizer of hackathon '{hack_title}'.",
            "adminName": current_user.get("name", "Admin"),
            "createdAt": datetime.utcnow(),
        }
    )

    return {
        "success": True,
        "message": f"Revision reminder dispatched to organizer for '{hack_title}'.",
    }
