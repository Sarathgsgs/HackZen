from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from models.hackathonModel import HackathonStatus, HackathonTheme
import json


class HackathonBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=20, max_length=2000)
    location: Optional[str] = None
    problemStatement: Optional[str] = Field(None, alias="problemStatement")
    themes: List[Union[HackathonTheme, str]] = Field(
        default_factory=lambda: ["Web Dev"]
    )
    registrationStart: Optional[Union[datetime, str]] = Field(
        None, alias="registrationStart"
    )
    registrationEnd: Optional[Union[datetime, str]] = Field(
        None, alias="registrationEnd"
    )
    hackathonStart: Optional[Union[datetime, str]] = Field(None, alias="hackathonStart")
    hackathonEnd: Optional[Union[datetime, str]] = Field(None, alias="hackathonEnd")
    startDate: Optional[Union[datetime, str]] = Field(None, alias="startDate")
    endDate: Optional[Union[datetime, str]] = Field(None, alias="endDate")
    maxTeamSize: int = Field(default=4, alias="maxTeamSize")
    minTeamSize: int = Field(default=1, alias="minTeamSize")
    isPublic: bool = Field(default=True, alias="isPublic")
    rules: List[str] = []
    status: Union[HackathonStatus, str] = HackathonStatus.DRAFT
    posterUrl: Optional[str] = Field(None, alias="posterUrl")
    templateUrl: Optional[str] = Field(None, alias="templateUrl")

    model_config = {"populate_by_name": True, "from_attributes": True, "extra": "allow"}


class HackathonCreate(HackathonBase):
    pass


class HackathonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    problemStatement: Optional[str] = Field(None, alias="problemStatement")
    themes: Optional[List[HackathonTheme]] = None
    registrationStart: Optional[Union[datetime, str]] = Field(
        None, alias="registrationStart"
    )
    registrationEnd: Optional[Union[datetime, str]] = Field(
        None, alias="registrationEnd"
    )
    hackathonStart: Optional[Union[datetime, str]] = Field(None, alias="hackathonStart")
    hackathonEnd: Optional[Union[datetime, str]] = Field(None, alias="hackathonEnd")
    startDate: Optional[Union[datetime, str]] = Field(None, alias="startDate")
    endDate: Optional[Union[datetime, str]] = Field(None, alias="endDate")
    maxTeamSize: Optional[int] = Field(None, alias="maxTeamSize")
    minTeamSize: Optional[int] = Field(None, alias="minTeamSize")
    isPublic: Optional[bool] = Field(None, alias="isPublic")
    rules: Optional[List[str]] = None
    status: Optional[HackathonStatus] = None
    posterUrl: Optional[str] = Field(None, alias="posterUrl")
    templateUrl: Optional[str] = Field(None, alias="templateUrl")

    model_config = {"populate_by_name": True, "from_attributes": True, "extra": "allow"}


class HackathonResponse(HackathonBase):
    id: Optional[str] = Field(None, alias="_id")
    organizerId: Optional[str] = Field(None, alias="organizerId")
    createdAt: Optional[Union[datetime, str]] = Field(None, alias="createdAt")
    updatedAt: Optional[Union[datetime, str]] = Field(None, alias="updatedAt")
    participants_count: int = Field(default=0, alias="participants_count")
    organizerName: Optional[str] = None
    maxTeams: Optional[int] = None
    resources: List[Dict[str, Any]] = []
    prizes: List[Dict[str, Any]] = []

    model_config = {"populate_by_name": True, "from_attributes": True, "extra": "allow"}
