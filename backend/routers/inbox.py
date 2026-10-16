from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationType,
    NotificationResponse,
)
from models.notification import NotificationInDB

router = APIRouter()


def get_notifications_collection():
    return get_db()["notifications"]


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    type: Optional[str] = Query(None, description="Filter by notification type"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(with_auth),
):
    """Get user's notifications"""
    notifications_collection = get_notifications_collection()

    # Using camelCase as per finalized schema
    query = {"userId": current_user["sub"]}

    if unread_only:
        query["read"] = False

    if type:
        query["type"] = type

    cursor = (
        notifications_collection.find(query)
        .sort("createdAt", -1)
        .skip(skip)
        .limit(limit)
    )
    notifications = await cursor.to_list(limit)

    result = []
    for notification in notifications:
        notification["_id"] = str(notification["_id"])
        result.append(NotificationResponse(**notification))

    return result


@router.get("/count")
async def get_notification_count(
    unread_only: bool = Query(True, description="Count only unread notifications"),
    current_user: dict = Depends(with_auth),
):
    """Get count of notifications"""
    notifications_collection = get_notifications_collection()

    query = {"userId": current_user["sub"]}
    if unread_only:
        query["read"] = False

    count = await notifications_collection.count_documents(query)

    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str, current_user: dict = Depends(with_auth)
):
    """Mark a notification as read"""
    notifications_collection = get_notifications_collection()

    # Use _id for internal search
    notification = await notifications_collection.find_one(
        {"_id": ObjectId(notification_id), "userId": current_user["sub"]}
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    if notification.get("read"):
        return {"message": "Notification already marked as read"}

    await notifications_collection.update_one(
        {"_id": ObjectId(notification_id)}, {"$set": {"read": True}}
    )

    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_notifications_as_read(current_user: dict = Depends(with_auth)):
    """Mark all notifications as read"""
    notifications_collection = get_notifications_collection()

    result = await notifications_collection.update_many(
        {"userId": current_user["sub"], "read": False}, {"$set": {"read": True}}
    )

    return {
        "message": f"Marked {result.modified_count} notifications as read",
        "count": result.modified_count,
    }


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str, current_user: dict = Depends(with_auth)
):
    """Delete a notification"""
    notifications_collection = get_notifications_collection()

    notification = await notifications_collection.find_one(
        {"_id": ObjectId(notification_id), "userId": current_user["sub"]}
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    await notifications_collection.delete_one({"_id": ObjectId(notification_id)})

    return {"message": "Notification deleted"}


@router.post("/send")
async def send_notification(
    user_id: str = Body(..., embed=True),
    type: str = Body(..., embed=True),
    message: str = Body(..., embed=True),
    hackathon_id: Optional[str] = Body(None, embed=True),
    team_id: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(RequireRole(["admin", "organizer", "mentor"])),
):
    """Send a notification (Admin/Organizer/Mentor only)"""

    # Create notification
    notifications_collection = get_notifications_collection()

    notification_data = {
        "userId": user_id,
        "hackathonId": hackathon_id,
        "teamId": team_id,
        "type": type,
        "message": message,
        "read": False,
        "createdAt": datetime.utcnow(),
    }

    result = await notifications_collection.insert_one(notification_data)
    notification_data["_id"] = str(result.inserted_id)

    return {
        "message": "Notification sent successfully",
        "notification": notification_data,
    }


@router.get("/types")
async def get_notification_types():
    """Get all available notification types"""
    return [
        {"value": "team_invite", "label": "Team Invitation"},
        {"value": "mentor_assignment", "label": "Mentor Assignment"},
        {"value": "mentor_feedback", "label": "Mentor Feedback"},
        {"value": "checkpoint_approval", "label": "Checkpoint Approval"},
        {"value": "stage_completion", "label": "Stage Completion"},
        {"value": "hackathon_update", "label": "Hackathon Update"},
        {"value": "submission_reminder", "label": "Submission Reminder"},
        {"value": "certificate_issued", "label": "Certificate Issued"},
        {"value": "system_alert", "label": "System Alert"},
    ]
