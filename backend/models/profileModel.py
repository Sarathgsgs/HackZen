from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field


class StudentInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    userId: str = Field(..., alias="userId")
    collegeName: str = Field(..., alias="collegeName")
    department: str
    yearOfStudy: int = Field(..., alias="yearOfStudy", ge=1, le=5)
    skills: List[str] = []

    class Config:
        populate_by_name = True


class MentorInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    userId: str = Field(..., alias="userId")
    expertiseDomains: List[str] = Field(..., alias="expertiseDomains", min_items=1)
    experienceYears: int = Field(..., alias="experienceYears", ge=0)
    availability: str = Field(default="Available")
    bio: Optional[str] = Field(None, max_length=500)
    companyName: Optional[str] = Field(None, alias="companyName")
    phoneNumber: Optional[str] = Field(None, alias="phoneNumber")
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")
    githubUrl: Optional[str] = Field(None, alias="githubUrl")

    class Config:
        populate_by_name = True


class OrganizerInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    userId: str = Field(..., alias="userId")
    institutionName: str = Field(..., alias="institutionName")
    institutionType: str = Field(
        ..., alias="institutionType"
    )  # college | company | NGO
    designation: str

    class Config:
        populate_by_name = True


class AdminInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    userId: str = Field(..., alias="userId")

    class Config:
        populate_by_name = True
