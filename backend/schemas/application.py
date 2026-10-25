from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApplicationBase(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    userId: Optional[str] = Field(None, alias="userId")
    teamId: Optional[str] = Field(None, alias="teamId")
    status: Any = Field(default=ApplicationStatus.PENDING)
    teamName: Optional[str] = None
    teamSize: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None


class ApplicationCreate(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    teamId: Optional[str] = Field(None, alias="teamId")
    teamName: Optional[str] = Field(None, alias="teamName")
    leaderName: Optional[str] = Field(None, alias="leaderName")
    leaderEmail: Optional[str] = Field(None, alias="leaderEmail")
    teamSize: Optional[int] = Field(2, alias="teamSize")
    notes: Optional[str] = Field(None, alias="notes")
    memberEmails: Optional[list] = Field(default_factory=list, alias="memberEmails")

    model_config = {"populate_by_name": True, "extra": "allow"}


class ApplicationUpdate(BaseModel):
    status: Optional[Any] = None
    teamId: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    id: str = Field(..., alias="_id")
    userId: str = Field(..., alias="userId")
    appliedAt: Optional[datetime] = Field(default_factory=datetime.utcnow, alias="appliedAt")

    class Config:
        populate_by_name = True
        extra = "allow"
