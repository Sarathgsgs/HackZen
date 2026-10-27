from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class HackathonStatus(str, Enum):
    DRAFT = "Draft"
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    NEEDS_REVISION = "Needs Revision"
    UPCOMING = "Upcoming"
    REGISTRATION_OPEN = "Registration Open"
    ONGOING = "Ongoing"
    JUDGING = "Judging"
    RESULTS_ANNOUNCED = "Results Announced"
    COMPLETED = "Completed"


class HackathonTheme(str, Enum):
    AI_ML = "AIML"
    LLM = "LLM"
    GEN_AI = "GenAI"
    WEB_DEV = "Web Dev"
    MOBILE_DEV = "Mobile Dev"
    DATA_SCIENCE = "Data Science"
    CYBERSECURITY = "Cyber Security"
    CLOUD = "Cloud Computing"
    DEVSECOPS = "DevSecOps"
    IOT = "IoT"
    BLOCKCHAIN = "Blockchain"
    GAMING = "Gaming"
    EDUCATION = "Education"
    HEALTHCARE = "Health Care"
    FINANCE = "Finance"


class HackathonInDB(BaseModel):
    id: str = Field(..., alias="_id")
    organizerId: str = Field(..., alias="organizerId")
    title: str
    description: str
    location: Optional[str] = None
    problemStatement: Optional[str] = Field(None, alias="problemStatement")
    themes: List[HackathonTheme]

    # Timeline
    registrationStart: datetime = Field(..., alias="registrationStart")
    registrationEnd: datetime = Field(..., alias="registrationEnd")
    hackathonStart: datetime = Field(..., alias="hackathonStart")
    hackathonEnd: datetime = Field(..., alias="hackathonEnd")

    # Configuration
    maxTeamSize: int = Field(default=4, alias="maxTeamSize")
    minTeamSize: int = Field(default=1, alias="minTeamSize")
    maxTeams: Optional[int] = Field(None, alias="maxTeams")
    isPublic: bool = Field(default=True, alias="isPublic")
    status: HackathonStatus = HackathonStatus.DRAFT

    # Resources
    rules: List[str] = []
    resources: List[Dict[str, str]] = []
    prizes: List[Dict[str, Any]] = []

    posterUrl: Optional[str] = Field(None, alias="posterUrl")
    templateUrl: Optional[str] = Field(None, alias="templateUrl")

    createdAt: datetime = Field(..., alias="createdAt")
    updatedAt: datetime = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}
