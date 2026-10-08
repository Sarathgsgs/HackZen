from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import Field
from schemas.evaluation import EvaluationBase


class EvaluationInDB(EvaluationBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    submissionId: Optional[str] = Field(None, alias="submissionId")
    evaluatedAt: datetime = Field(default_factory=datetime.utcnow, alias="evaluatedAt")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda dt: dt.isoformat()}
