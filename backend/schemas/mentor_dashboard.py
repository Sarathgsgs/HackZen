from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class FeedbackType(str, Enum):
    CODE_REVIEW = "code_review"
    PERFORMANCE = "performance"
    GENERAL = "general"
    IMPROVEMENT = "improvement"


class FeedbackStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"


class CriteriaRatings(BaseModel):
    projectUnderstanding: Optional[int] = Field(default=None, ge=1, le=5)
    technicalApproach: Optional[int] = Field(default=None, ge=1, le=5)
    innovation: Optional[int] = Field(default=None, ge=1, le=5)
    feasibility: Optional[int] = Field(default=None, ge=1, le=5)
    presentationReadiness: Optional[int] = Field(default=None, ge=1, le=5)
    marketPotential: Optional[int] = Field(default=None, ge=1, le=5)
    userExperience: Optional[int] = Field(default=None, ge=1, le=5)
    collaboration: Optional[int] = Field(default=None, ge=1, le=5)


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============= TASK SCHEMA =============
class TaskCreate(BaseModel):
    studentId: str
    teamId: str
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=2000)
    deadline: datetime
    priority: str = "medium"
    category: str = "development"


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    progress: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None


class TaskResponse(TaskCreate):
    id: str = Field(alias="_id")
    mentorId: str
    status: TaskStatus = TaskStatus.PENDING
    progress: int = 0
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


# ============= FEEDBACK SCHEMA =============
class FeedbackCreate(BaseModel):
    # Feedback is scoped to an assigned team. studentId remains optional only
    # for compatibility with historical individual-feedback records.
    studentId: Optional[str] = None
    teamId: str
    taskId: Optional[str] = None
    type: Optional[FeedbackType] = FeedbackType.GENERAL
    title: Optional[str] = Field(default="Evaluation Feedback", max_length=160)
    content: Optional[str] = Field(default="", max_length=5000)
    guidance: Optional[str] = Field(default=None, max_length=5000)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    criteriaRatings: Optional[CriteriaRatings] = None
    status: Optional[FeedbackStatus] = FeedbackStatus.DRAFT


class FeedbackSubmit(BaseModel):
    criteriaRatings: CriteriaRatings
    guidance: str = Field(min_length=5, max_length=5000)
    feedbackType: Optional[str] = "General"


class FeedbackResponse(BaseModel):
    id: str = Field(alias="_id")
    mentorId: str
    mentorName: Optional[str] = None
    teamId: str
    teamName: Optional[str] = None
    status: str = "draft"
    type: Optional[str] = "general"
    title: Optional[str] = None
    content: Optional[str] = ""
    guidance: Optional[str] = ""
    rating: Optional[int] = None
    criteriaRatings: Optional[Dict[str, int]] = None
    overallScore: Optional[float] = None
    submittedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


# ============= MEETING SCHEMA =============
class MeetingCreate(BaseModel):
    # Meetings are always scoped to one assigned team.  The server derives the
    # recipients from teamMembers; clients must never choose recipients.
    teamId: str
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=2000)
    startTime: datetime
    endTime: datetime
    meetingLink: Optional[str] = None
    location: Optional[str] = None

    @model_validator(mode="after")
    def end_must_follow_start(self):
        if self.endTime <= self.startTime:
            raise ValueError("Meeting end time must be after its start time")
        return self


class MeetingResponse(MeetingCreate):
    id: str = Field(alias="_id")
    mentorId: str
    status: MeetingStatus = MeetingStatus.SCHEDULED
    attendees: List[str] = Field(default_factory=list)
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True


# ============= PROGRESS SCHEMA =============
class ProgressResponse(BaseModel):
    studentId: str
    studentName: str
    teamId: str
    teamName: str
    completedTasks: int = 0
    totalTasks: int = 0
    progressPercentage: float = 0.0
    lastUpdated: datetime


# ============= ATTENDANCE SCHEMA =============
class AttendanceRecord(BaseModel):
    studentId: str
    meetingId: str
    attended: bool
    checkInTime: Optional[datetime] = None
    checkOutTime: Optional[datetime] = None
    qrCodeVerified: bool = False
    notes: Optional[str] = None


# ============= PERFORMANCE SCHEMA =============
class PerformanceMetrics(BaseModel):
    studentId: str
    studentName: str
    avgTaskCompletion: float = 0.0
    avgFeedbackRating: float = 0.0
    attendanceRate: float = 0.0
    activityScore: float = 0.0
    strengths: List[str] = Field(default_factory=list)
    improvementAreas: List[str] = Field(default_factory=list)


# ============= REPORT SCHEMA =============
class ReportResponse(BaseModel):
    studentId: str
    studentName: str
    teamId: str
    teamName: str
    reportType: str
    period: dict
    tasksSummary: dict
    feedbackSummary: dict
    performanceMetrics: dict
    recommendations: List[str]
    generatedAt: datetime
