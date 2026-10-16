from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    MENTOR = "mentor"
    ORGANIZER = "organizer"
    ADMIN = "admin"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            for member in cls:
                if member.value == value.lower():
                    return member
        return None


class UserBase(BaseModel):
    name: Optional[str] = ""
    email: EmailStr
    role: UserRole

    model_config = {"populate_by_name": True, "from_attributes": True, "extra": "allow"}


class UserCreate(UserBase):
    password: str

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        import re
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*?&#^()_\-+=\[\]{}|:;<>,.~]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: str = Field(..., alias="_id")
    createdAt: Optional[datetime] = Field(None, alias="createdAt")

    model_config = {"populate_by_name": True, "from_attributes": True, "extra": "allow"}


class UserMyResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: Optional[str] = ""
    email: EmailStr
    role: UserRole

    model_config = {"populate_by_name": True, "from_attributes": True, "extra": "allow"}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    twoFactorCode: Optional[str] = None


class TokenResponse(BaseModel):
    token: Optional[str] = None
    user: Optional[UserResponse] = None
    requires2FA: Optional[bool] = False
    message: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str

    @validator("newPassword")
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        import re
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*?&#^()_\-+=\[\]{}|:;<>,.~]", v):
            raise ValueError("Password must contain at least one special character")
        return v

