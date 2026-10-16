from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field
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


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============= TASK ASSIGNMENT =============
class TaskCreate(BaseModel):
    studentId: str
    teamId: str
    title: str
    description: str
    deadline: datetime
    priority: str = "medium"  # low, medium, high
    category: str = "development"


class TaskInDB(TaskCreate):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    mentorId: str
    status: TaskStatus = TaskStatus.PENDING
    progress: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


# ============= FEEDBACK SYSTEM =============
class FeedbackCreate(BaseModel):
    studentId: str
    teamId: Optional[str] = None
    taskId: Optional[str] = None
    type: FeedbackType
    title: str
    content: str
    rating: Optional[int] = None  # 1-5


class FeedbackInDB(FeedbackCreate):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    mentorId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


# ============= MEETING SCHEDULER =============
class MeetingCreate(BaseModel):
    studentIds: List[str]
    teamId: Optional[str] = None
    title: str
    description: str
    startTime: datetime
    endTime: datetime
    meetingLink: Optional[str] = None
    location: Optional[str] = None


class MeetingInDB(MeetingCreate):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    mentorId: str
    status: MeetingStatus = MeetingStatus.SCHEDULED
    attendees: List[str] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


# ============= PROGRESS TRACKING =============
class StudentProgress(BaseModel):
    studentId: str
    teamId: str
    completedTasks: int = 0
    totalTasks: int = 0
    progressPercentage: float = 0.0
    lastUpdated: datetime = Field(default_factory=datetime.utcnow)
    activities: List[dict] = Field(default_factory=list)  # [{type, description, timestamp}]


# ============= ATTENDANCE TRACKING =============
class AttendanceRecord(BaseModel):
    studentId: str
    meetingId: str
    attended: bool
    checkInTime: Optional[datetime] = None
    checkOutTime: Optional[datetime] = None
    qrCodeVerified: bool = False
    notes: Optional[str] = None


# ============= PERFORMANCE ANALYTICS =============
class PerformanceMetrics(BaseModel):
    studentId: str
    avgTaskCompletion: float = 0.0
    avgFeedbackRating: float = 0.0
    attendanceRate: float = 0.0
    activityScore: float = 0.0  # 0-100
    strengths: List[str] = Field(default_factory=list)
    improvementAreas: List[str] = Field(default_factory=list)
    lastAnalyzed: datetime = Field(default_factory=datetime.utcnow)


# ============= REPORT GENERATION =============
class ReportData(BaseModel):
    studentId: str
    teamId: str
    reportType: str  # "weekly", "monthly", "final"
    period: dict  # {start: datetime, end: datetime}
    tasksSummary: dict
    feedbackSummary: dict
    performanceMetrics: dict
    recommendations: List[str] = Field(default_factory=list)
    generatedAt: datetime = Field(default_factory=datetime.utcnow)
