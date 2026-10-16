from datetime import datetime
from typing import Optional, List, Union, Literal, Annotated
from pydantic import BaseModel, Field


# ========== STUDENT PROFILE ==========
class StudentProfileCreate(BaseModel):
    name: Optional[str] = None
    collegeName: Optional[str] = Field(None, alias="collegeName")
    department: Optional[str] = None
    yearOfStudy: Optional[int] = Field(None, alias="yearOfStudy")
    skills: List[str] = []
    bio: Optional[str] = None
    phoneNumber: Optional[str] = Field(None, alias="phoneNumber")
    githubUrl: Optional[str] = Field(None, alias="githubUrl")
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")

    model_config = {"populate_by_name": True, "from_attributes": True}


class StudentProfileUpdate(BaseModel):
    name: Optional[str] = None
    collegeName: Optional[str] = Field(None, alias="collegeName")
    department: Optional[str] = None
    yearOfStudy: Optional[int] = Field(None, alias="yearOfStudy")
    skills: Optional[List[str]] = None
    bio: Optional[str] = None
    phoneNumber: Optional[str] = Field(None, alias="phoneNumber")
    githubUrl: Optional[str] = Field(None, alias="githubUrl")
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")


class StudentProfile(StudentProfileCreate):
    role: Literal["student"] = "student"
    id: str = Field(..., alias="_id")
    userId: str = Field(..., alias="userId")
    createdAt: Optional[datetime] = Field(None, alias="createdAt")
    updatedAt: Optional[datetime] = Field(None, alias="updatedAt")


# ========== MENTOR PROFILE ==========
class MentorProfileCreate(BaseModel):
    name: Optional[str] = None
    expertiseDomains: List[str] = Field(default=[], alias="expertiseDomains")
    experienceYears: Optional[int] = Field(None, alias="experienceYears")
    # These values match the choices exposed by the mentor settings screen.
    availability: Literal["Available", "Busy", "Offline", "Unavailable"] = "Available"
    bio: Optional[str] = None
    companyName: Optional[str] = Field(None, alias="companyName")
    phoneNumber: Optional[str] = Field(None, alias="phoneNumber")
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")
    githubUrl: Optional[str] = Field(None, alias="githubUrl")

    model_config = {"populate_by_name": True, "from_attributes": True}


class MentorProfileUpdate(BaseModel):
    name: Optional[str] = None
    expertiseDomains: Optional[List[str]] = Field(None, alias="expertiseDomains")
    experienceYears: Optional[int] = Field(None, alias="experienceYears")
    availability: Optional[Literal["Available", "Busy", "Offline", "Unavailable"]] = None
    bio: Optional[str] = None
    companyName: Optional[str] = Field(None, alias="companyName")
    phoneNumber: Optional[str] = Field(None, alias="phoneNumber")
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")
    githubUrl: Optional[str] = Field(None, alias="githubUrl")


class MentorProfile(MentorProfileCreate):
    role: Literal["mentor"] = "mentor"
    id: str = Field(..., alias="_id")
    userId: str = Field(..., alias="userId")
    createdAt: Optional[datetime] = Field(None, alias="createdAt")
    updatedAt: Optional[datetime] = Field(None, alias="updatedAt")


# ========== ORGANIZER PROFILE ==========
class OrganizerProfileCreate(BaseModel):
    name: Optional[str] = None
    institutionName: Optional[str] = Field(None, alias="institutionName")
    institutionType: Optional[str] = Field(None, alias="institutionType")
    designation: Optional[str] = None
    bio: Optional[str] = None
    phoneNumber: Optional[str] = Field(None, alias="phoneNumber")
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")
    emailReports: Optional[str] = Field(default="weekly", alias="emailReports")
    autoApproveMentors: Optional[bool] = Field(
        default=False, alias="autoApproveMentors"
    )

    model_config = {"populate_by_name": True, "from_attributes": True}


class OrganizerProfileUpdate(BaseModel):
    name: Optional[str] = None
    institutionName: Optional[str] = Field(None, alias="institutionName")
    institutionType: Optional[str] = Field(None, alias="institutionType")
    designation: Optional[str] = None
    bio: Optional[str] = None
    phoneNumber: Optional[str] = Field(None, alias="phoneNumber")
    linkedinUrl: Optional[str] = Field(None, alias="linkedinUrl")
    emailReports: Optional[str] = Field(None, alias="emailReports")
    autoApproveMentors: Optional[bool] = Field(None, alias="autoApproveMentors")


class OrganizerProfile(OrganizerProfileCreate):
    role: Literal["organizer"] = "organizer"
    id: str = Field(..., alias="_id")
    userId: str = Field(..., alias="userId")
    createdAt: Optional[datetime] = Field(None, alias="createdAt")
    updatedAt: Optional[datetime] = Field(None, alias="updatedAt")


# ========== ADMIN PROFILE ==========
class AdminProfileCreate(BaseModel):
    name: Optional[str] = None
    pass

    model_config = {"populate_by_name": True, "from_attributes": True}


class AdminProfileUpdate(BaseModel):
    name: Optional[str] = None
    pass


class AdminProfile(AdminProfileCreate):
    role: Literal["admin"] = "admin"
    id: str = Field(..., alias="_id")
    userId: str = Field(..., alias="userId")
    createdAt: Optional[datetime] = Field(None, alias="createdAt")
    updatedAt: Optional[datetime] = Field(None, alias="updatedAt")


# Union types
ProfileUpdate = Union[
    StudentProfileUpdate,
    MentorProfileUpdate,
    OrganizerProfileUpdate,
    AdminProfileUpdate,
]
ProfileResponse = Annotated[
    Union[StudentProfile, MentorProfile, OrganizerProfile, AdminProfile],
    Field(discriminator="role"),
]
