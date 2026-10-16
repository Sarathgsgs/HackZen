from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum


class NotificationType(str, Enum):
    TEAM_INVITE = "team_invite"
    MENTOR_ASSIGNMENT = "mentor_assignment"
    MENTOR_FEEDBACK = "mentor_feedback"
    CHECKPOINT_APPROVAL = "checkpoint_approval"
    STAGE_COMPLETION = "stage_completion"
    HACKATHON_UPDATE = "hackathon_update"
    SUBMISSION_REMINDER = "submission_reminder"
    CERTIFICATE_ISSUED = "certificate_issued"
    SYSTEM_ALERT = "system_alert"
    MENTOR_REQUEST = "mentor_request"
    MENTOR_REQUEST_DECISION = "mentor_request_decision"
    MEETING_REMINDER = "meeting_reminder"


class NotificationBase(BaseModel):
    userId: str = Field(..., alias="userId")
    hackathonId: Optional[str] = Field(None, alias="hackathonId")
    teamId: Optional[str] = Field(None, alias="teamId")
    type: str  # team_invite | mentor_assignment | milestone_check | etc
    message: str
    read: bool = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: str = Field(..., alias="_id")
    createdAt: datetime = Field(..., alias="createdAt")

    class Config:
        populate_by_name = True
