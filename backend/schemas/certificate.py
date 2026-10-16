from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from typing import Optional


class CertificateBase(BaseModel):
    userId: str = Field(..., alias="userId")
    teamId: Optional[str] = Field(None, alias="teamId")
    hackathonId: Optional[str] = Field(None, alias="hackathonId")
    title: Optional[str] = Field(None, alias="title")
    completionDate: Optional[str] = Field(None, alias="completionDate")
    description: Optional[str] = Field(None, alias="description")
    certificateUrl: str = Field(..., alias="certificateUrl")
    filePath: Optional[str] = Field(None, alias="filePath")


class CertificateResponse(CertificateBase):
    id: str = Field(..., alias="_id")
    issuedAt: datetime = Field(..., alias="issuedAt")
    validationId: Optional[str] = Field(None, alias="validationId")

    class Config:
        populate_by_name = True
