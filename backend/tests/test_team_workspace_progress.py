import unittest
from datetime import datetime
from unittest.mock import patch

from bson import ObjectId
from fastapi import HTTPException

from routers import progress
from schemas.progress import MilestoneProgressCreate, MilestoneProgressUpdate


class Cursor:
    def __init__(self, rows):
        self.rows = list(rows)

    async def to_list(self, length):
        return self.rows[:length]


class Collection:
    def __init__(self, rows=()):
        self.rows = list(rows)

    async def find_one(self, query, *_args, **_kwargs):
        return next((row for row in self.rows if all(row.get(key) == value for key, value in query.items())), None)

    def find(self, query):
        return Cursor([row for row in self.rows if all(row.get(key) == value for key, value in query.items())])

    async def insert_one(self, document):
        row = dict(document)
        row.setdefault("_id", ObjectId())
        self.rows.append(row)
        return type("InsertResult", (), {"inserted_id": row["_id"]})()

    async def update_one(self, query, update):
        row = await self.find_one(query)
        if row:
            row.update(update.get("$set", {}))
        return type("UpdateResult", (), {"matched_count": int(row is not None), "modified_count": int(row is not None)})()


class Database:
    def __init__(self, **collections):
        self.collections = collections

    def __getitem__(self, name):
        return self.collections.setdefault(name, Collection())


class TeamWorkspaceProgressTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.team_id = ObjectId()
        self.progress_id = ObjectId()
        self.user_id = ObjectId()
        self.student = {"id": str(self.user_id), "sub": str(self.user_id), "role": "student", "name": "Student One"}
        self.db = Database(
            teams=Collection([{"_id": self.team_id, "hackathonId": str(ObjectId())}]),
            teamMembers=Collection([{"teamId": str(self.team_id), "userId": str(self.user_id)}]),
            progress=Collection([{
                "_id": self.progress_id,
                "teamId": str(self.team_id),
                "hackathonId": str(ObjectId()),
                "currentStageId": "stage-1",
                "status": "in-progress",
                "lastUpdated": datetime.utcnow(),
            }]),
            milestoneProgress=Collection(),
            teamActivity=Collection(),
            users=Collection([{"_id": self.user_id, "name": "Student One"}]),
            teamFiles=Collection(),
            submissions=Collection(),
        )

    async def test_member_can_create_update_and_reload_a_task_with_activity(self):
        with patch("routers.progress.get_db", return_value=self.db):
            created = await progress.create_milestone_progress(
                MilestoneProgressCreate(
                    progressId=str(self.progress_id), milestoneId="task_1", title="Review the prototype"
                ),
                self.student,
            )
            self.assertEqual(created.title, "Review the prototype")
            self.assertFalse(created.completed)

            updated = await progress.update_milestone_progress(
                created.id, MilestoneProgressUpdate(completed=True), self.student
            )
            tasks = await progress.get_milestones_progress(str(self.progress_id), self.student)
            activity = await progress.get_team_activity(str(self.team_id), self.student)

        self.assertTrue(updated.completed)
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].title, "Review the prototype")
        self.assertEqual(len(activity), 2)
        self.assertEqual(activity[0]["user"], "Student One")
        self.assertIn("task", activity[0]["action"])

    async def test_nonmember_cannot_read_team_progress_or_activity(self):
        nonmember = {"id": str(ObjectId()), "sub": str(ObjectId()), "role": "student"}
        nonmember["sub"] = nonmember["id"]
        with patch("routers.progress.get_db", return_value=self.db):
            with self.assertRaises(HTTPException) as progress_error:
                await progress.get_team_progress(str(self.team_id), nonmember)
            with self.assertRaises(HTTPException) as activity_error:
                await progress.get_team_activity(str(self.team_id), nonmember)
        self.assertEqual(progress_error.exception.status_code, 403)
        self.assertEqual(activity_error.exception.status_code, 403)

    async def test_member_without_tasks_gets_an_empty_list(self):
        with patch("routers.progress.get_db", return_value=self.db):
            tasks = await progress.get_milestones_progress(str(self.progress_id), self.student)
        self.assertEqual(tasks, [])

    async def test_activity_uses_persisted_member_file_and_submission_timestamps(self):
        joined_at = datetime(2026, 1, 3, 10, 0)
        uploaded_at = datetime(2026, 1, 4, 10, 0)
        submitted_at = datetime(2026, 1, 5, 10, 0)
        self.db["teamMembers"].rows[0]["joinedAt"] = joined_at
        self.db["teamFiles"].rows.append({"_id": ObjectId(), "teamId": str(self.team_id), "uploadedAt": uploaded_at, "uploadedBy": "Student One", "fileName": "plan.pdf"})
        self.db["submissions"].rows.append({"_id": ObjectId(), "teamId": str(self.team_id), "submittedAt": submitted_at, "project": "Team project"})

        with patch("routers.progress.get_db", return_value=self.db):
            events = await progress.get_team_activity(str(self.team_id), self.student)

        self.assertEqual([event["createdAt"] for event in events], [submitted_at, uploaded_at, joined_at])
        self.assertEqual([event["item"] for event in events], ["Team project", "plan.pdf", ""])

    async def test_nonmember_cannot_update_a_team_task(self):
        task_id = ObjectId()
        self.db["milestoneProgress"].rows.append({
            "_id": task_id, "progressId": str(self.progress_id), "milestoneId": "task-1", "title": "Task", "completed": False,
        })
        nonmember_id = str(ObjectId())
        nonmember = {"id": nonmember_id, "sub": nonmember_id, "role": "student"}
        with patch("routers.progress.get_db", return_value=self.db):
            with self.assertRaises(HTTPException) as raised:
                await progress.update_milestone_progress(str(task_id), MilestoneProgressUpdate(completed=True), nonmember)
        self.assertEqual(raised.exception.status_code, 403)
        self.assertFalse(self.db["milestoneProgress"].rows[0]["completed"])


if __name__ == "__main__":
    unittest.main()
