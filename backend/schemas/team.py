from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId


class TeamMemberRole(str, Enum):
    LEADER = "leader"
    MEMBER = "member"
    FRONTEND_DEVELOPER = "frontend_developer"
    BACKEND_DEVELOPER = "backend_developer"
    UI_UX_DESIGNER = "ui_ux_designer"
    RESEARCHER = "researcher"


class TeamMemberBase(BaseModel):
    teamId: str = Field(..., alias="teamId")
    userId: str = Field(..., alias="userId")
    role: TeamMemberRole = TeamMemberRole.MEMBER


class TeamMemberCreate(TeamMemberBase):
    pass


class TeamMemberResponse(TeamMemberBase):
    id: str = Field(..., alias="_id")
    joinedAt: datetime = Field(..., alias="joinedAt")

    # Enriched from the registered user record by the team-members endpoint.
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None

    class Config:
        populate_by_name = True


class TeamBase(BaseModel):
    hackathonId: str = Field(..., alias="hackathonId")
    teamName: str = Field(..., alias="teamName")

    # Useful event label for team listings.
    hackathonName: Optional[str] = Field(None, alias="hackathonName")
    domain: Optional[str] = None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    teamName: Optional[str] = None
    mentorId: Optional[str] = None


class TeamMentorUpdate(BaseModel):
    mentorId: str
    focusArea: Optional[str] = Field(None, max_length=100)
    guidanceRequest: Optional[str] = Field(None, max_length=600)
    preferredTimeWindow: Optional[str] = Field(None, max_length=80)


class MentorRequestCreate(BaseModel):
    """A team leader's request for a specific mentor."""
    mentorId: str
    message: Optional[str] = Field(None, max_length=1000)


class MentorRequestDecision(BaseModel):
    decision: str = Field(..., pattern="^(approved|rejected)$")
    responseMessage: Optional[str] = Field(None, max_length=1000)


class TeamResponse(TeamBase):
    id: Optional[str] = Field(None, alias="_id")
    teamCode: Optional[str] = Field(None, alias="teamCode")
    createdBy: Optional[str] = Field(None, alias="createdBy")
    mentorId: Optional[str] = Field(None, alias="mentorId")
    createdAt: datetime = Field(..., alias="createdAt")

    # Student and mentor portal fields.
    myRole: Optional[TeamMemberRole] = None
    memberCount: int = 0
    maxTeamSize: Optional[int] = None

    # Admin and organizer dashboard fields.
    progress: int = 0
    currentStage: Optional[str] = None
    hackathonTitle: Optional[str] = None
    description: Optional[str] = None
    requiredSkills: List[str] = Field(default_factory=list)
    maxSize: int = 4
    status: Optional[str] = None
    mentorRequestStatus: Optional[str] = None

    class Config:
        populate_by_name = True
