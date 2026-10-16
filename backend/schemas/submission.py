from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId


class SubmissionBase(BaseModel):
    teamId: str = Field(..., alias="teamId")
    stageId: str = Field(default="initial_stage", alias="stageId")
    fileUrl: str = Field(default="", alias="fileUrl")
    project: str = Field(default="Untitled Project", alias="project")
    desc: str = Field(default="", alias="desc")
    category: str = Field(default="General", alias="category")
    status: str = Field(default="Submitted", alias="status")
    version: Optional[int] = Field(default=1, alias="version")
    githubUrl: Optional[str] = Field(default="", alias="githubUrl")
    liveDemoUrl: Optional[str] = Field(default="", alias="liveDemoUrl")
    isLate: Optional[bool] = Field(default=False, alias="isLate")
    lateAudit: Optional[str] = Field(default="", alias="lateAudit")
    aiScore: Optional[int] = Field(default=None, alias="aiScore")
    aiReview: Optional[str] = Field(default=None, alias="aiReview")


class SubmissionCreate(SubmissionBase):
    version: int = 1


class SubmissionResponse(SubmissionBase):
    id: str = Field(..., alias="_id")
    submittedAt: datetime = Field(..., alias="submittedAt")

    class Config:
        populate_by_name = True
