from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from models.hackathonModel import HackathonStatus, HackathonTheme
import json


class HackathonBase(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    problemStatement: Optional[str] = Field(None, alias="problemStatement")
    themes: List[HackathonTheme]
    registrationStart: datetime = Field(..., alias="registrationStart")
    registrationEnd: datetime = Field(..., alias="registrationEnd")
    hackathonStart: datetime = Field(..., alias="hackathonStart")
    hackathonEnd: datetime = Field(..., alias="hackathonEnd")
    maxTeamSize: int = Field(default=4, alias="maxTeamSize")
    minTeamSize: int = Field(default=1, alias="minTeamSize")
    isPublic: bool = Field(default=True, alias="isPublic")
    rules: List[str] = []
    status: HackathonStatus = HackathonStatus.DRAFT
    posterUrl: Optional[str] = Field(None, alias="posterUrl")
    templateUrl: Optional[str] = Field(None, alias="templateUrl")


class HackathonCreate(HackathonBase):
    pass


class HackathonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    problemStatement: Optional[str] = Field(None, alias="problemStatement")
    themes: Optional[List[HackathonTheme]] = None
    registrationStart: Optional[datetime] = Field(None, alias="registrationStart")
    registrationEnd: Optional[datetime] = Field(None, alias="registrationEnd")
    hackathonStart: Optional[datetime] = Field(None, alias="hackathonStart")
    hackathonEnd: Optional[datetime] = Field(None, alias="hackathonEnd")
    maxTeamSize: Optional[int] = Field(None, alias="maxTeamSize")
    minTeamSize: Optional[int] = Field(None, alias="minTeamSize")
    isPublic: Optional[bool] = Field(None, alias="isPublic")
    rules: Optional[List[str]] = None
    status: Optional[HackathonStatus] = None
    posterUrl: Optional[str] = Field(None, alias="posterUrl")
    templateUrl: Optional[str] = Field(None, alias="templateUrl")


class HackathonResponse(HackathonBase):
    id: str = Field(..., alias="_id")
    organizerId: str = Field(..., alias="organizerId")
    createdAt: datetime = Field(..., alias="createdAt")
    updatedAt: datetime = Field(..., alias="updatedAt")
    participants_count: int = Field(default=0, alias="participants_count")
    organizerName: Optional[str] = None
    maxTeams: Optional[int] = None
    resources: List[Dict[str, Any]] = []
    prizes: List[Dict[str, Any]] = []

    class Config:
        populate_by_name = True
        from_attributes = True
