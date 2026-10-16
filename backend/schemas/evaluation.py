from pydantic import BaseModel, Field
from typing import Dict, Optional
from datetime import datetime
from bson import ObjectId


class EvaluationBase(BaseModel):
    teamId: str = Field(..., alias="teamId")
    submissionId: Optional[str] = Field(None, alias="submissionId")
    judgeId: Optional[str] = Field(
        None, alias="judgeId"
    )  # mentor userId, set by backend
    scores: Dict[str, float]
    feedback: str
    totalScore: float = Field(..., alias="totalScore")


class EvaluationCreate(EvaluationBase):
    pass


class EvaluationResponse(EvaluationBase):
    id: str = Field(..., alias="_id")
    evaluatedAt: datetime = Field(..., alias="evaluatedAt")

    class Config:
        populate_by_name = True
