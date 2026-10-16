from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from database import MongoDB
from schemas.mentor_dashboard import (
    TaskCreate,
    FeedbackCreate,
    MeetingCreate,
    TaskStatus,
)


class MentorDashboardService:
    """Service for mentor dashboard operations"""

    # ============= TASK MANAGEMENT =============
    @staticmethod
    async def create_task(task_data: TaskCreate, mentor_id: str) -> Dict[str, Any]:
        """Create a new task for a student"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        tasks_collection = MongoDB.db.tasks
        
        task_dict = {
            "mentorId": mentor_id,
            "studentId": task_data.studentId,
            "teamId": task_data.teamId,
            "title": task_data.title,
            "description": task_data.description,
            "deadline": task_data.deadline,
            "priority": task_data.priority,
            "category": task_data.category,
            "status": TaskStatus.PENDING.value,
            "progress": 0,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        
        result = await tasks_collection.insert_one(task_dict)
        task_dict["_id"] = str(result.inserted_id)
        return task_dict

    @staticmethod
    async def get_mentor_tasks(mentor_id: str, student_id: Optional[str] = None) -> List[Dict]:
        """Get all tasks assigned by mentor, optionally filtered by student"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        tasks_collection = MongoDB.db.tasks
        query = {"mentorId": mentor_id}
        if student_id:
            query["studentId"] = student_id
        
        tasks = await tasks_collection.find(query).to_list(None)
        for task in tasks:
            task["_id"] = str(task["_id"])
        return tasks

    @staticmethod
    async def update_task_status(task_id: str, task_update, mentor_id: str) -> Dict:
        """Update task status and progress"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        tasks_collection = MongoDB.db.tasks
        if not ObjectId.is_valid(task_id):
            raise ValueError("Invalid task ID")
        updates = task_update.model_dump(exclude_none=True)
        if "status" in updates:
            updates["status"] = updates["status"].value
        if "progress" in updates and not 0 <= updates["progress"] <= 100:
            raise ValueError("Progress must be between 0 and 100")
        if not updates:
            raise ValueError("Provide at least one task field to update")
        updates["updatedAt"] = datetime.utcnow()
        result = await tasks_collection.update_one({"_id": ObjectId(task_id), "mentorId": mentor_id}, {"$set": updates})
        
        return {"matched": result.matched_count, "modified": result.modified_count}

    # ============= FEEDBACK SYSTEM =============
    @staticmethod
    async def create_feedback(feedback_data: FeedbackCreate, mentor_id: str, team: Dict[str, Any], mentor_name: str) -> Dict[str, Any]:
        """Create an append-only feedback record for an assigned team."""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        feedback_collection = MongoDB.db.feedback
        
        now = datetime.utcnow()
        feedback_id = str(ObjectId())
        feedback_dict = {
            "feedbackId": feedback_id,
            "hackathonId": str(team.get("hackathonId", "")),
            "mentorId": mentor_id,
            "teamId": feedback_data.teamId,
            "teamName": team.get("teamName", "Assigned team"),
            "mentorName": mentor_name,
            "type": feedback_data.type.value,
            "feedbackType": feedback_data.title,
            "title": feedback_data.title,
            "content": feedback_data.content,
            "comments": feedback_data.content,
            "rating": feedback_data.rating,
            "createdAt": now,
            "updatedAt": now,
        }
        
        result = await feedback_collection.insert_one(feedback_dict)
        feedback_dict["_id"] = str(result.inserted_id)
        return feedback_dict

    @staticmethod
    async def get_student_feedback(student_id: str) -> List[Dict]:
        """Get all feedback for a student"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        feedback_collection = MongoDB.db.feedback
        feedbacks = await feedback_collection.find({"studentId": student_id}).to_list(None)
        for fb in feedbacks:
            fb["_id"] = str(fb["_id"])
        return feedbacks

    # ============= MEETING SCHEDULER =============
    @staticmethod
    async def create_meeting(meeting_data: MeetingCreate, mentor_id: str) -> Dict[str, Any]:
        """Create a team-scoped meeting. Recipient selection happens server-side."""
        if MongoDB.db is None:
            await MongoDB.connect()

        if not ObjectId.is_valid(meeting_data.teamId):
            raise ValueError("Invalid team ID")

        team = await MongoDB.db.teams.find_one({"_id": ObjectId(meeting_data.teamId)})
        if not team:
            raise LookupError("Team not found")
        if team.get("mentorId") != mentor_id:
            # This prevents a mentor from scheduling or notifying another mentor's team.
            raise PermissionError("You are not assigned to this team")

        meetings_collection = MongoDB.db.meetings
        members = await MongoDB.db.teamMembers.find({"teamId": meeting_data.teamId}).to_list(None)
        student_ids = list({member["userId"] for member in members})
        if not student_ids:
            raise ValueError("The selected team has no members")

        meeting_dict = {
            "mentorId": mentor_id,
            "studentIds": student_ids,
            "teamId": meeting_data.teamId,
            "title": meeting_data.title,
            "description": meeting_data.description,
            "startTime": meeting_data.startTime,
            "endTime": meeting_data.endTime,
            "meetingLink": meeting_data.meetingLink,
            "location": meeting_data.location,
            "status": "scheduled",
            "attendees": [],
            # The worker sends one reminder to exactly these recipients 30 minutes before start.
            "reminderDueAt": meeting_data.startTime - timedelta(minutes=30),
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        
        result = await meetings_collection.insert_one(meeting_dict)
        meeting_dict["_id"] = str(result.inserted_id)
        return meeting_dict

    @staticmethod
    async def send_due_meeting_reminders() -> int:
        """Send each due meeting reminder once, only to its team and mentor."""
        if MongoDB.db is None:
            return 0

        now = datetime.utcnow()
        meetings = await MongoDB.db.meetings.find({
            "status": "scheduled",
            "reminderSentAt": {"$exists": False},
            "reminderDueAt": {"$lte": now},
            "startTime": {"$gt": now},
        }).to_list(None)
        sent = 0
        for meeting in meetings:
            # Atomically claim the reminder. This also avoids duplicates when more than one
            # application worker is running.
            claimed = await MongoDB.db.meetings.update_one(
                {"_id": meeting["_id"], "reminderSentAt": {"$exists": False}},
                {"$set": {"reminderSentAt": now, "updatedAt": now}},
            )
            if not claimed.modified_count:
                continue

            recipients = set(meeting.get("studentIds", []))
            recipients.add(meeting["mentorId"])
            message = f"Reminder: {meeting.get('title', 'Review meeting')} starts at {meeting['startTime'].strftime('%d %b, %I:%M %p UTC')}."
            docs = [{
                "userId": user_id,
                "hackathonId": None,
                "teamId": meeting.get("teamId"),
                "meetingId": str(meeting["_id"]),
                "type": "meeting_reminder",
                "message": message,
                "read": False,
                "createdAt": now,
            } for user_id in recipients]
            if docs:
                await MongoDB.db.notifications.insert_many(docs)
                sent += len(docs)
        return sent

    @staticmethod
    async def get_mentor_meetings(mentor_id: str, upcoming_only: bool = True) -> List[Dict]:
        """Get all meetings scheduled by mentor"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        meetings_collection = MongoDB.db.meetings
        query = {"mentorId": mentor_id}
        
        if upcoming_only:
            query["startTime"] = {"$gte": datetime.utcnow()}
        
        meetings = await meetings_collection.find(query).sort("startTime", 1).to_list(None)
        for meeting in meetings:
            meeting["_id"] = str(meeting["_id"])
        return meetings

    # ============= PROGRESS TRACKING =============
    @staticmethod
    async def get_student_progress(mentor_id: str, student_id: str) -> Dict[str, Any]:
        """Calculate student progress metrics"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        tasks_collection = MongoDB.db.tasks
        students_collection = MongoDB.db.students
        
        # Get all tasks for the student
        tasks = await tasks_collection.find({
            "mentorId": mentor_id,
            "studentId": student_id
        }).to_list(None)
        
        # Get student info
        student = await students_collection.find_one({"userId": student_id})
        
        # Calculate metrics
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t["status"] == "completed"])
        progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "studentId": student_id,
            "studentName": student.get("name", "") if student else "Unknown",
            "totalTasks": total_tasks,
            "completedTasks": completed_tasks,
            "progressPercentage": round(progress_percentage, 2),
            "tasks": tasks,
            "lastUpdated": datetime.utcnow()
        }

    @staticmethod
    async def get_all_assigned_students(mentor_id: str) -> List[Dict]:
        """Get all students assigned to mentor (by teams)"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        teams_collection = MongoDB.db.teams
        team_members_collection = MongoDB.db.teamMembers
        users_collection = MongoDB.db.users
        
        # Get teams mentored by this mentor
        teams = await teams_collection.find({"mentorId": mentor_id}).to_list(None)
        
        all_students = []
        for team in teams:
            # Get team members
            members = await team_members_collection.find({
                "teamId": str(team["_id"])
            }).to_list(None)
            
            for member in members:
                user = await users_collection.find_one({"_id": ObjectId(member["userId"])})
                if user:
                    all_students.append({
                        "studentId": str(user["_id"]),
                        "name": user.get("name"),
                        "email": user.get("email"),
                        "teamId": str(team["_id"]),
                        "teamName": team.get("teamName", "Unnamed Team"),
                        "role": member.get("role")
                    })
        
        return all_students

    # ============= PERFORMANCE ANALYTICS =============
    @staticmethod
    async def calculate_performance_metrics(mentor_id: str, student_id: str) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics for a student"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        tasks_collection = MongoDB.db.tasks
        feedback_collection = MongoDB.db.feedback
        meetings_collection = MongoDB.db.meetings
        
        # Task completion rate
        all_tasks = await tasks_collection.find({
            "mentorId": mentor_id,
            "studentId": student_id
        }).to_list(None)
        
        completed = len([t for t in all_tasks if t["status"] == "completed"])
        avg_task_completion = (completed / len(all_tasks) * 100) if all_tasks else 0
        
        # Feedback ratings
        feedbacks = await feedback_collection.find({
            "mentorId": mentor_id,
            "studentId": student_id,
            "rating": {"$exists": True}
        }).to_list(None)
        
        avg_feedback_rating = (sum(f["rating"] for f in feedbacks) / len(feedbacks)) if feedbacks else 0
        
        # Attendance rate
        meetings = await meetings_collection.find({
            "mentorId": mentor_id,
            "studentIds": student_id
        }).to_list(None)
        
        attended = len([m for m in meetings if student_id in m.get("attendees", [])])
        attendance_rate = (attended / len(meetings) * 100) if meetings else 0
        
        # Activity score (0-100)
        activity_score = (avg_task_completion * 0.4 + avg_feedback_rating * 0.4 + attendance_rate * 0.2)
        
        return {
            "studentId": student_id,
            "avgTaskCompletion": round(avg_task_completion, 2),
            "avgFeedbackRating": round(avg_feedback_rating, 2),
            "attendanceRate": round(attendance_rate, 2),
            "activityScore": round(activity_score, 2),
            "strengths": ["Consistent completion", "Good feedback"] if activity_score > 70 else [],
            "improvementAreas": ["Punctuality", "Code quality"] if activity_score < 70 else []
        }

    # ============= REPORT GENERATION =============
    @staticmethod
    async def generate_student_report(
        mentor_id: str,
        student_id: str,
        report_type: str = "weekly"
    ) -> Dict[str, Any]:
        """Generate a comprehensive student progress report"""
        if MongoDB.db is None:
            await MongoDB.connect()
        
        # Calculate period based on report type
        now = datetime.utcnow()
        if report_type == "weekly":
            start = now - timedelta(days=7)
        elif report_type == "monthly":
            start = now - timedelta(days=30)
        else:  # final
            start = datetime.min
        
        tasks_collection = MongoDB.db.tasks
        feedback_collection = MongoDB.db.feedback
        users_collection = MongoDB.db.users
        teams_collection = MongoDB.db.teams
        
        # Get relevant data
        tasks = await tasks_collection.find({
            "mentorId": mentor_id,
            "studentId": student_id,
            "createdAt": {"$gte": start}
        }).to_list(None)
        
        feedbacks = await feedback_collection.find({
            "mentorId": mentor_id,
            "studentId": student_id,
            "createdAt": {"$gte": start}
        }).to_list(None)
        
        # Get student and team info
        student = await users_collection.find_one({"_id": ObjectId(student_id)})
        teams = await teams_collection.find({
            "mentorId": mentor_id,
            "$or": [
                {"teamLead": student_id},
                {"members": student_id}
            ]
        }).to_list(None)
        
        # Generate summaries
        tasks_summary = {
            "total": len(tasks),
            "completed": len([t for t in tasks if t["status"] == "completed"]),
            "pending": len([t for t in tasks if t["status"] == "pending"]),
            "blocked": len([t for t in tasks if t["status"] == "blocked"])
        }
        
        feedback_summary = {
            "total": len(feedbacks),
            "avgRating": sum(f.get("rating", 0) for f in feedbacks) / len(feedbacks) if feedbacks else 0,
            "types": {}
        }
        
        for feedback in feedbacks:
            fb_type = feedback.get("type", "general")
            feedback_summary["types"][fb_type] = feedback_summary["types"].get(fb_type, 0) + 1
        
        # Get performance metrics
        metrics = await MentorDashboardService.calculate_performance_metrics(mentor_id, student_id)
        
        return {
            "studentId": student_id,
            "studentName": student.get("name", "") if student else "Unknown",
            "teamId": str(teams[0]["_id"]) if teams else None,
            "teamName": teams[0].get("name", "") if teams else "N/A",
            "reportType": report_type,
            "period": {
                "start": start.isoformat(),
                "end": now.isoformat()
            },
            "tasksSummary": tasks_summary,
            "feedbackSummary": feedback_summary,
            "performanceMetrics": metrics,
            "recommendations": [
                "Continue with consistent task completion",
                "Attend all scheduled meetings",
                "Improve code quality based on feedback"
            ],
            "generatedAt": now.isoformat()
        }
