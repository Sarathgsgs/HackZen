from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApplicationBase(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    userId: Optional[str] = Field(None, alias="userId")
    teamId: Optional[str] = Field(None, alias="teamId")
    status: ApplicationStatus = ApplicationStatus.PENDING
    teamName: Optional[str] = None
    teamSize: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    teamId: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    id: str = Field(..., alias="_id")
    userId: str = Field(..., alias="userId")
    appliedAt: datetime = Field(..., alias="appliedAt")

    class Config:
        populate_by_name = True
