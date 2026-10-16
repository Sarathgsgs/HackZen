from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId


class ProgressStatus(str, Enum):
    NOT_STARTED = "not-started"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"


class MilestoneProgressBase(BaseModel):
    progressId: str = Field(..., alias="progressId")
    milestoneId: str = Field(..., alias="milestoneId")
    completed: bool = False
    title: Optional[str] = Field(None, max_length=160)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Optional[str] = None
    dueDate: Optional[datetime] = None
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    verifiedBy: Optional[str] = Field(None, alias="verifiedBy")
    verifiedAt: Optional[datetime] = Field(None, alias="verifiedAt")


class MilestoneProgressCreate(MilestoneProgressBase):
    pass


class MilestoneProgressResponse(MilestoneProgressBase):
    id: str = Field(..., alias="_id")
    createdBy: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedBy: Optional[str] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True


class MilestoneProgressUpdate(BaseModel):
    completed: bool


class TeamProgressBase(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    teamId: str = Field(..., alias="teamId")
    currentStageId: str = Field(..., alias="currentStageId")
    status: ProgressStatus = ProgressStatus.NOT_STARTED
    percentage: int = Field(0, ge=0, le=100)


class TeamProgressCreate(TeamProgressBase):
    pass


class TeamProgressUpdate(BaseModel):
    currentStageId: Optional[str] = None
    status: Optional[ProgressStatus] = None
    percentage: Optional[int] = Field(None, ge=0, le=100)


class ProgressHistoryPoint(BaseModel):
    percentage: int = Field(..., ge=0, le=100)
    updatedAt: datetime


class TeamProgressResponse(TeamProgressBase):
    id: str = Field(..., alias="_id")
    lastUpdated: datetime = Field(..., alias="lastUpdated")
    progressHistory: List[ProgressHistoryPoint] = Field(default_factory=list, alias="progressHistory")

    class Config:
        populate_by_name = True
