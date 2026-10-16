from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum
from pydantic import BaseModel, Field


class MessageType(str, Enum):
    TEXT = "text"
    CODE = "code"
    FILE = "file"
    CHECKPOINT = "checkpoint"
    DECISION = "decision"
    MENTOR_FEEDBACK = "mentor_feedback"
    IMAGE = "image"
    VIDEO = "video"


class ChatMessageBase(BaseModel):
    teamId: str = Field(..., alias="teamId")
    senderId: str = Field(..., alias="senderId")
    senderName: Optional[str] = Field(None, alias="senderName")
    messageType: MessageType = Field(MessageType.TEXT, alias="messageType")
    content: str
    isCheckpoint: bool = Field(False, alias="isCheckpoint")

    class Config:
        populate_by_name = True


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageSend(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    messageType: MessageType = MessageType.TEXT


class TeamFileResponse(BaseModel):
    id: str = Field(..., alias="_id")
    teamId: str
    name: str
    url: str
    size: int
    contentType: Optional[str] = None
    attachmentType: Optional[str] = None
    uploadedBy: str
    uploadedByName: Optional[str] = None
    createdAt: datetime

    class Config:
        populate_by_name = True


class ChatMessageResponse(ChatMessageBase):
    id: str = Field(..., alias="_id")
    createdAt: datetime = Field(..., alias="createdAt")
    fileId: Optional[str] = None
    attachmentName: Optional[str] = None
    attachmentUrl: Optional[str] = None
    attachmentType: Optional[str] = None
    attachmentSize: Optional[int] = None

    class Config:
        populate_by_name = True
