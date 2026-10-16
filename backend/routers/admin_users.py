from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId

from database import get_db
from core.dependencies import RequireRole

router = APIRouter(prefix="/admin/users", tags=["Admin Users"])


class RoleUpdateRequest(BaseModel):
    new_role: str
    reason: Optional[str] = "Admin update"


class StatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = "Administrative action"
    duration: Optional[str] = None
    message: Optional[str] = None


class BulkUserActionRequest(BaseModel):
    user_ids: List[str]
    action: str
    value: Optional[str] = None
    reason: Optional[str] = None


def format_relative_time(dt: Optional[datetime]) -> str:
    if not dt or not isinstance(dt, datetime):
        return "Recently"
    now = datetime.utcnow()
    diff = now - dt
    seconds = diff.total_seconds()
    if seconds < 120:
        return "Just now"
    if seconds < 3600:
        return f"{int(seconds // 60)} mins ago"
    if seconds < 86400:
        return f"{int(seconds // 3600)} hrs ago"
    if seconds < 172800:
        return "Yesterday, " + dt.strftime("%I:%M %p")
    if seconds < 604800:
        return f"{int(seconds // 86400)} days ago"
    return dt.strftime("%b %d, %I:%M %p")


async def evaluate_user_risk(db, u: dict) -> dict:
    """
    Evaluates real dynamic risk score and risk factor indicators based on user's platform history:
    1. Account Status (Suspended/Deactivated -> +40)
    2. Email / Org Verification (Unverified email -> +15, Unverified org for Organizers/Mentors -> +15)
    3. Dispute Cases Involvement (Active disputes -> +30 per case, Confirmed violations -> +25)
    4. Security Audit Log Signals (Failed login attempts or suspicious flags in last 7 days -> +10)
    5. Account Inactivity (No activity in >30 days -> +10)
    """
    score = 0
    factors = []

    u_id = str(u.get("_id", u.get("id", "")))
    u_email = u.get("email", "")
    status = u.get("status", "Active")
    role = str(u.get("role", "STUDENT")).upper()

    # Factor 1: Status Check
    if status in ["Suspended", "Deactivated", "Restricted"]:
        score += 40
        reason = u.get("suspensionReason", "Administrative suspension")
        factors.append(f"Account currently {status} ({reason})")

    # Factor 2: Verification Check
    email_verified = u.get("emailVerified", True)
    if not email_verified:
        score += 15
        factors.append("Email address unverified")

    org_verified = u.get("orgVerified", role in ["ADMIN", "ORGANIZER"])
    if role in ["ORGANIZER", "MENTOR"] and not org_verified:
        score += 15
        factors.append("Organization / Professional credentials unverified")

    # Factor 3: Disputes & Policy Violations Check
    disputes_query = {
        "$or": [
            {"reporter.email": u_email},
            {"reportedTeam.name": u.get("teamName", "")},
            {"reportedTeam.members": u_email},
            {"userId": u_id},
        ]
    }
    open_disputes = await db["disputes"].count_documents(
        {**disputes_query, "status": {"$in": ["Under Investigation", "Open", "open"]}}
    )
    resolved_violations = await db["disputes"].count_documents(
        {
            **disputes_query,
            "status": "Resolved",
            "resolution.decision": {
                "$in": ["Disqualification", "Major Violation", "Warning"]
            },
        }
    )

    if open_disputes > 0:
        score += 30 * open_disputes
        factors.append(f"Named in {open_disputes} active dispute investigation(s)")

    if resolved_violations > 0:
        score += 25 * resolved_violations
        factors.append(f"Record of {resolved_violations} confirmed policy violation(s)")

    # Factor 4: Failed Logins & Security Audit Events (Last 7 Days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    failed_logins = await db["audit_logs"].count_documents(
        {
            "details": {"$regex": u_email, "$options": "i"},
            "category": {"$in": ["Security", "Auth", "Users"]},
            "action": {"$regex": "Failed|Suspicious|Blocked", "$options": "i"},
            "timestamp": {"$gte": seven_days_ago},
        }
    )
    if failed_logins > 0:
        score += min(30, failed_logins * 10)
        factors.append(
            f"{failed_logins} failed login / security flag(s) in last 7 days"
        )

    # Factor 5: Inactivity Check (>30 Days)
    login_dt = u.get("lastLogin") or u.get("updatedAt")
    if isinstance(login_dt, datetime):
        inactivity_days = (datetime.utcnow() - login_dt).days
        if inactivity_days > 30:
            score += 10
            factors.append(f"Account inactive for {inactivity_days} days")

    # Categorize Risk Level
    if score >= 60:
        risk_level = "CRITICAL"
    elif score >= 35:
        risk_level = "HIGH"
    elif score >= 15:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
        if not factors:
            factors = ["No suspicious activities flagged", "Account status clean"]

    return {"riskScore": score, "riskLevel": risk_level, "riskFactors": factors}


@router.get("/")
@router.get("")
async def get_all_users(
    current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    db = get_db()
    users = (
        await db["users"].find({}, {"password": 0}).sort("createdAt", -1).to_list(None)
    )

    formatted_users = []
    for u in users:
        u_id = str(u["_id"])
        created_dt = u.get("createdAt")
        login_dt = u.get("lastLogin") or u.get("updatedAt") or created_dt

        # Dynamic risk assessment
        risk_eval = await evaluate_user_risk(db, u)

        # Mentor-specific present vs past workload calculation
        u_role = str(u.get("role", "STUDENT")).upper()
        active_teams_count = 0
        past_teams_count = 0
        is_overloaded = False

        if u_role == "MENTOR":
            query_conds = [{"mentorId": u_id}, {"mentorEmail": u.get("email", "")}]
            if ObjectId.is_valid(u_id):
                query_conds.append({"mentorId": ObjectId(u_id)})

            assigned_teams = await db["teams"].find({"$or": query_conds}).to_list(None)
            for t in assigned_teams:
                # Check status
                t_status = t.get("status", "Active")
                if t_status in ["Completed", "Graduated", "Archived", "completed"]:
                    past_teams_count += 1
                else:
                    active_teams_count += 1

            is_overloaded = active_teams_count > 5 or u.get("isOverloaded", False)

        formatted_users.append(
            {
                "id": u_id,
                "name": u.get("name", u.get("email", "Unknown User").split("@")[0]),
                "email": u.get("email", ""),
                "role": u_role,
                "status": u.get("status", "Active"),
                "college": u.get(
                    "college", u.get("organization", "Platform Participant")
                ),
                "department": u.get("department", "Engineering & Technology"),
                "year": u.get("year", "3rd Year"),
                "emailVerified": u.get("emailVerified", True),
                "orgVerified": u.get(
                    "orgVerified",
                    u.get("role") in ["ORGANIZER", "organizer", "ADMIN", "admin"],
                ),
                "riskLevel": risk_eval["riskLevel"],
                "riskScore": risk_eval["riskScore"],
                "riskFactors": risk_eval["riskFactors"],
                "activeTeamsCount": active_teams_count,
                "pastTeamsCount": past_teams_count,
                "totalTeamsCount": active_teams_count + past_teams_count,
                "isOverloaded": is_overloaded,
                "joinedDate": (
                    created_dt.strftime("%b %d, %Y")
                    if isinstance(created_dt, datetime)
                    else "Aug 10, 2026"
                ),
                "lastActive": format_relative_time(login_dt),
            }
        )
    return {"success": True, "users": formatted_users}


@router.get("/{user_id}/profile")
async def get_user_profile(
    user_id: str, current_user: dict = Depends(RequireRole(["admin", "superadmin"]))
):
    """Fetch rich user profile with dynamic risk assessment, platform activity metrics, and activity history stream"""
    db = get_db()
    query = (
        {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    )
    u = await db["users"].find_one(query, {"password": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    u_id = str(u["_id"])
    created_dt = u.get("createdAt")
    login_dt = u.get("lastLogin") or created_dt

    # Dynamic risk evaluation engine
    risk_eval = await evaluate_user_risk(db, u)

    # Aggregate platform counts
    hacks_count = await db["applications"].count_documents({"userId": u_id})
    teams_count = await db["teamMembers"].count_documents({"userId": u_id})
    subs_count = await db["submissions"].count_documents({"userId": u_id})
    certs_count = await db["certificates"].count_documents({"userId": u_id})

    # Mentor specific present vs past teams queries
    active_teams_count = 0
    past_teams_count = 0
    if str(u.get("role", "")).upper() == "MENTOR":
        query_conds = [{"mentorId": u_id}, {"mentorEmail": u.get("email", "")}]
        if ObjectId.is_valid(u_id):
            query_conds.append({"mentorId": ObjectId(u_id)})
        assigned = await db["teams"].find({"$or": query_conds}).to_list(None)
        for t in assigned:
            if t.get("status") in ["Completed", "Graduated", "Archived", "completed"]:
                past_teams_count += 1
            else:
                active_teams_count += 1

    # Fetch real user activity logs from audit_logs collection
    user_logs = (
        await db["audit_logs"]
        .find(
            {
                "$or": [
                    {"userId": u_id},
                    {"details": {"$regex": u.get("email", "---"), "$options": "i"}},
                ]
            }
        )
        .sort("timestamp", -1)
        .limit(6)
        .to_list(None)
    )

    recent_activities = []
    for log in user_logs:
        log_dt = log.get("timestamp") or log.get("createdAt")
        recent_activities.append(
            {
                "time": (
                    format_relative_time(log_dt)
                    if isinstance(log_dt, datetime)
                    else "Recently"
                ),
                "event": f"{log.get('action', 'Activity')}: {log.get('details', '')}",
            }
        )

    if not recent_activities:
        recent_activities = [
            {
                "time": (
                    format_relative_time(created_dt)
                    if isinstance(created_dt, datetime)
                    else "Recently"
                ),
                "event": "Account created on HackZen platform",
            }
        ]

    profile_data = {
        "id": u_id,
        "name": u.get("name", u.get("email", "User").split("@")[0]),
        "email": u.get("email", ""),
        "role": str(u.get("role", "STUDENT")).upper(),
        "status": u.get("status", "Active"),
        "college": u.get(
            "college", u.get("organization", "ProEduvate Partner Institution")
        ),
        "department": u.get("department", "Computer Science"),
        "year": u.get("year", "3rd Year"),
        "emailVerified": u.get("emailVerified", True),
        "orgVerified": u.get(
            "orgVerified", u.get("role") in ["ORGANIZER", "organizer", "ADMIN", "admin"]
        ),
        "riskLevel": risk_eval["riskLevel"],
        "riskScore": risk_eval["riskScore"],
        "riskFactors": risk_eval["riskFactors"],
        "activeTeamsCount": active_teams_count,
        "pastTeamsCount": past_teams_count,
        "totalTeamsCount": active_teams_count + past_teams_count,
        "isOverloaded": active_teams_count > 5,
        "joinedDate": (
            created_dt.strftime("%b %d, %Y")
            if isinstance(created_dt, datetime)
            else "Aug 10, 2026"
        ),
        "lastActive": format_relative_time(login_dt),
        "activitySummary": {
            "hackathonsCount": hacks_count,
            "teamsCount": teams_count,
            "activeTeamsCount": active_teams_count,
            "pastTeamsCount": past_teams_count,
            "submissionsCount": subs_count,
            "certsCount": certs_count,
            "mentorSessionsCount": await db["chat"].count_documents({"senderId": u_id}),
        },
        "recentActivities": recent_activities,
    }
    return {"success": True, "profile": profile_data}


@router.put("/{user_id}/role")
async def update_user_role(
    user_id: str,
    data: RoleUpdateRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    db = get_db()
    query = (
        {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    )
    result = await db["users"].update_one(
        query, {"$set": {"role": data.new_role.upper()}}
    )
    if result.matched_count == 0:
        await db["users"].update_one(
            {"id": user_id}, {"$set": {"role": data.new_role.upper()}}, upsert=True
        )

    await db["audit_logs"].insert_one(
        {
            "action": "Role Changed",
            "category": "Users",
            "details": f"Changed user {user_id} role to {data.new_role.upper()}. Reason: {data.reason}",
            "adminName": current_user.get("name", "Admin"),
            "timestamp": datetime.utcnow(),
        }
    )

    return {"success": True, "message": f"User role updated to {data.new_role.upper()}"}


@router.put("/{user_id}/status")
async def update_user_status(
    user_id: str,
    data: StatusUpdateRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    db = get_db()
    query = (
        {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    )
    is_active = data.status == "Active"

    result = await db["users"].update_one(
        query,
        {
            "$set": {
                "status": data.status,
                "is_active": is_active,
                "suspensionReason": data.reason,
                "suspensionDuration": data.duration,
            }
        },
    )
    if result.matched_count == 0:
        await db["users"].update_one(
            {"id": user_id},
            {"$set": {"status": data.status, "is_active": is_active}},
            upsert=True,
        )

    if data.status in ["Suspended", "Deactivated"]:
        await db["notifications"].insert_one(
            {
                "userId": user_id,
                "type": "ACCOUNT_ALERT",
                "title": f"Account {data.status}",
                "message": data.message
                or f"Your account status has been updated to {data.status} for: {data.reason}. Duration: {data.duration or 'Permanent'}.",
                "readBy": [],
                "createdAt": datetime.utcnow(),
            }
        )

    await db["audit_logs"].insert_one(
        {
            "action": f"User {data.status}",
            "category": "Users",
            "details": f"Admin marked user {user_id} as {data.status}. Reason: {data.reason}. Duration: {data.duration}",
            "adminName": current_user.get("name", "Admin"),
            "timestamp": datetime.utcnow(),
        }
    )

    return {"success": True, "message": f"User status changed to {data.status}"}


@router.post("/bulk-action")
async def bulk_user_action(
    payload: BulkUserActionRequest,
    current_user: dict = Depends(RequireRole(["admin", "superadmin"])),
):
    """Perform bulk action (Change Role, Suspend, Activate, Send Notification) across selected users"""
    db = get_db()
    user_ids = payload.user_ids
    action = payload.action

    if not user_ids:
        raise HTTPException(status_code=400, detail="No users selected")

    object_ids = [ObjectId(uid) for uid in user_ids if ObjectId.is_valid(uid)]
    query = {"$or": [{"_id": {"$in": object_ids}}, {"id": {"$in": user_ids}}]}

    if action == "change_role":
        new_role = (payload.value or "STUDENT").upper()
        await db["users"].update_many(query, {"$set": {"role": new_role}})
    elif action == "suspend":
        await db["users"].update_many(
            query, {"$set": {"status": "Suspended", "is_active": False}}
        )
    elif action == "activate":
        await db["users"].update_many(
            query, {"$set": {"status": "Active", "is_active": True}}
        )
    elif action == "notify":
        message = payload.value or "Notice from Admin governance panel."
        for uid in user_ids:
            await db["notifications"].insert_one(
                {
                    "userId": uid,
                    "title": "Administrative Broadcast Notice",
                    "message": message,
                    "readBy": [],
                    "createdAt": datetime.utcnow(),
                }
            )

    await db["audit_logs"].insert_one(
        {
            "action": f"Bulk User Action: {action}",
            "category": "Users",
            "details": f"Executed {action} for {len(user_ids)} users.",
            "adminName": current_user.get("name", "Admin"),
            "timestamp": datetime.utcnow(),
        }
    )

    return {"success": True, "count": len(user_ids), "action": action}
