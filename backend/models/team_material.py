from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class TeamMaterialBase(BaseModel):
    teamId: str
    originalName: str
    category: Optional[str] = "General"
    description: Optional[str] = None


class TeamMaterialCreate(TeamMaterialBase):
    pass


class UploadedByInfo(BaseModel):
    id: str
    name: str
    email: Optional[str] = None


class TeamMaterialResponse(BaseModel):
    id: str
    name: str
    originalName: str
    teamId: str
    teamName: Optional[str] = None
    type: str
    mimeType: str
    size: int
    category: Optional[str] = "General"
    description: Optional[str] = None
    storagePath: str
    uploadedBy: UploadedByInfo
    uploadedAt: datetime
    createdAt: datetime
    updatedAt: datetime


class StorageOverview(BaseModel):
    usedBytes: int
    usedFormatted: str
    totalBytes: int
    totalFormatted: str
    usagePercentage: float
    fileCount: int
