import unittest
import io
from datetime import datetime
from unittest.mock import AsyncMock, patch
from pathlib import Path

from bson import ObjectId
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi import UploadFile
from pydantic import ValidationError

from routers import chat, team, team_files


class FakeCursor:
    def __init__(self, documents):
        self.documents = list(documents)

    async def to_list(self, length):
        return self.documents[:length]

    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = list(documents or [])

    @staticmethod
    def _matches(document, query):
        for key, expected in query.items():
            if key == "$or":
                if not any(FakeCollection._matches(document, clause) for clause in expected):
                    return False
                continue
            actual = document.get(key)
            if isinstance(expected, dict) and "$in" in expected:
                if actual not in expected["$in"]:
                    return False
            elif isinstance(expected, dict) and "$exists" in expected:
                exists = key in document
                if exists != expected["$exists"]:
                    return False
                if "$ne" in expected and actual == expected["$ne"]:
                    return False
            elif actual != expected:
                return False
        return True

    async def find_one(self, query, *_args, **_kwargs):
        return next((item for item in self.documents if self._matches(item, query)), None)

    def find(self, query):
        return FakeCursor([item for item in self.documents if self._matches(item, query)])

    async def count_documents(self, query):
        return sum(self._matches(item, query) for item in self.documents)

    async def insert_one(self, document):
        created = dict(document)
        created.setdefault("_id", ObjectId())
        self.documents.append(created)
        return type("InsertResult", (), {"inserted_id": created["_id"]})()

    async def update_one(self, query, update):
        document = next((item for item in self.documents if self._matches(item, query)), None)
        modified = 0
        if document:
            modified = int(any(document.get(key) != value for key, value in update.get("$set", {}).items()))
            document.update(update.get("$set", {}))
        return type("UpdateResult", (), {"matched_count": int(document is not None), "modified_count": modified})()


class FakeDatabase:
    def __init__(self, **collections):
        self.collections = collections

    def __getitem__(self, name):
        return self.collections.setdefault(name, FakeCollection())

    def __getattr__(self, name):
        return self[name]


class OversizedUpload:
    def __init__(self, size):
        self.size = size
        self.position = 0

    def seek(self, position, whence=0):
        self.position = self.size if whence == 2 else position

    def tell(self):
        return self.position


class TeamMembersFlowTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.student = {"id": "student-1", "sub": "student-1", "role": "student"}

    def isolated_storage_dir(self):
        path = Path(__file__).parent / "_isolated_shared_file_storage"
        path.mkdir(exist_ok=True)
        return path

    @staticmethod
    def clear_isolated_storage(path):
        resolved = path.resolve()
        for child in path.iterdir():
            if child.is_file() and child.resolve().parent == resolved:
                child.unlink()
        path.rmdir()

    async def test_student_without_team_gets_empty_list(self):
        db = FakeDatabase(teamMembers=FakeCollection())
        with patch("routers.team.get_db", return_value=db):
            result = await team.get_my_teams(self.student)
        self.assertEqual(result, [])

    async def test_team_code_is_visible_only_to_the_team_lead(self):
        team_id = ObjectId()
        hackathon_id = ObjectId()
        db = FakeDatabase(
            teamMembers=FakeCollection([{
                "teamId": str(team_id), "userId": self.student["id"], "role": "member",
            }]),
            teams=FakeCollection([{
                "_id": team_id, "hackathonId": str(hackathon_id), "teamName": "Real team",
                "teamCode": "123456", "createdAt": datetime(2025, 1, 1),
            }]),
            hackathons=FakeCollection([{
                "_id": hackathon_id, "title": "Real hackathon", "maxTeamSize": 4,
            }]),
        )
        with patch("routers.team.get_db", return_value=db):
            result = await team.get_my_teams(self.student)
        self.assertEqual(result[0].myRole, "member")
        self.assertIsNone(result[0].teamCode)
        self.assertEqual(result[0].memberCount, 1)
        self.assertEqual(result[0].hackathonName, "Real hackathon")

    async def test_member_roster_contains_real_profile_fields_for_multiple_members(self):
        team_id = str(ObjectId())
        member_ids = [str(ObjectId()), str(ObjectId())]
        memberships = [
            {"_id": ObjectId(), "teamId": team_id, "userId": member_ids[0], "role": "leader", "joinedAt": datetime.utcnow()},
            {"_id": ObjectId(), "teamId": team_id, "userId": member_ids[1], "role": "member", "joinedAt": datetime.utcnow()},
        ]
        db = FakeDatabase(
            teamMembers=FakeCollection(memberships),
            teams=FakeCollection([{"_id": ObjectId(team_id), "mentorId": None}]),
            users=FakeCollection([
                {"_id": ObjectId(member_ids[0]), "name": "Leader", "email": "leader@example.test"},
                {"_id": ObjectId(member_ids[1]), "name": "Member", "email": "member@example.test"},
            ]),
            students=FakeCollection([
                {"userId": member_ids[0], "department": "Engineering"},
            ]),
        )
        viewer = {**self.student, "id": member_ids[1], "sub": member_ids[1]}
        with patch("routers.team.get_db", return_value=db):
            result = await team.get_team_members(team_id, viewer)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].name, "Leader")
        self.assertEqual(result[0].role, "leader")
        self.assertEqual(result[0].department, "Engineering")
        self.assertEqual(result[1].email, "member@example.test")

    async def test_nonmember_cannot_read_roster(self):
        team_id = str(ObjectId())
        db = FakeDatabase(teamMembers=FakeCollection(), teams=FakeCollection([{"_id": ObjectId(team_id)}]))
        with patch("routers.team.get_db", return_value=db):
            with self.assertRaises(HTTPException) as raised:
                await team.get_team_members(team_id, self.student)
        self.assertEqual(raised.exception.status_code, 403)

    async def test_student_can_join_open_one_member_team_by_code(self):
        team_id = ObjectId()
        hackathon_id = ObjectId()
        db = FakeDatabase(
            teams=FakeCollection([{"_id": team_id, "teamCode": "123456", "hackathonId": str(hackathon_id)}]),
            hackathons=FakeCollection([{"_id": hackathon_id, "maxTeamSize": 3}]),
            teamMembers=FakeCollection([
                {"_id": ObjectId(), "teamId": str(team_id), "userId": "leader", "role": "leader"},
            ]),
        )
        with patch("routers.team.get_db", return_value=db):
            result = await team.join_team("123456", self.student)
        self.assertEqual(result.teamId, str(team_id))
        self.assertEqual(len(db["teamMembers"].documents), 2)

    async def test_joining_full_team_is_rejected(self):
        team_id = ObjectId()
        hackathon_id = ObjectId()
        db = FakeDatabase(
            teams=FakeCollection([{"_id": team_id, "teamCode": "123456", "hackathonId": str(hackathon_id)}]),
            hackathons=FakeCollection([{"_id": hackathon_id, "maxTeamSize": 1}]),
            teamMembers=FakeCollection([
                {"_id": ObjectId(), "teamId": str(team_id), "userId": "leader", "role": "leader"},
            ]),
        )
        with patch("routers.team.get_db", return_value=db):
            with self.assertRaises(HTTPException) as raised:
                await team.join_team("123456", self.student)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(len(db["teamMembers"].documents), 1)

    async def test_nonstudent_cannot_join_by_code(self):
        with self.assertRaises(HTTPException) as raised:
            await team.join_team("123456", {"id": "mentor", "role": "mentor"})
        self.assertEqual(raised.exception.status_code, 403)

    async def test_team_lead_can_assign_available_mentor_and_persist_request_details(self):
        team_id = ObjectId()
        mentor_user_id = str(ObjectId())
        team_doc = {"_id": team_id, "hackathonId": str(ObjectId()), "teamName": "Team", "teamCode": "123456", "createdAt": datetime.utcnow()}
        db = FakeDatabase(
            teams=FakeCollection([team_doc]),
            teamMembers=FakeCollection([{"teamId": str(team_id), "userId": self.student["id"], "role": "leader"}]),
            mentors=FakeCollection([{"_id": ObjectId(), "userId": mentor_user_id, "availability": "Available"}]),
        )
        request = team.TeamMentorUpdate(mentorId=mentor_user_id, focusArea="Product", guidanceRequest="Review our flow", preferredTimeWindow="Weekends")
        with patch("routers.team.get_db", return_value=db):
            assigned = await team.assign_mentor(str(team_id), request, self.student)
        saved = db["teams"].documents[0]
        self.assertEqual(assigned.mentorId, mentor_user_id)
        self.assertEqual(saved["mentorRequest"]["guidanceRequest"], "Review our flow")
        self.assertEqual(saved["mentorRequest"]["focusArea"], "Product")
        self.assertIsInstance(saved["mentorAssignedAt"], datetime)

    async def test_nonleader_cannot_assign_mentor(self):
        team_id = ObjectId()
        db = FakeDatabase(
            teams=FakeCollection([{"_id": team_id, "teamName": "Team"}]),
            teamMembers=FakeCollection([{"teamId": str(team_id), "userId": self.student["id"], "role": "member"}]),
        )
        with patch("routers.team.get_db", return_value=db):
            with self.assertRaises(HTTPException) as raised:
                await team.assign_mentor(str(team_id), team.TeamMentorUpdate(mentorId="mentor"), self.student)
        self.assertEqual(raised.exception.status_code, 403)

    async def test_team_cannot_receive_a_second_mentor_assignment(self):
        team_id = ObjectId()
        mentor_user_id = str(ObjectId())
        db = FakeDatabase(
            teams=FakeCollection([{"_id": team_id, "teamName": "Team", "mentorId": "existing-mentor"}]),
            teamMembers=FakeCollection([{"teamId": str(team_id), "userId": self.student["id"], "role": "leader"}]),
        )
        with patch("routers.team.get_db", return_value=db):
            with self.assertRaises(HTTPException) as raised:
                await team.assign_mentor(str(team_id), team.TeamMentorUpdate(mentorId=mentor_user_id), self.student)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(db["teams"].documents[0]["mentorId"], "existing-mentor")

    async def test_unavailable_mentor_is_rejected(self):
        team_id = ObjectId()
        mentor_user_id = str(ObjectId())
        db = FakeDatabase(
            teams=FakeCollection([{"_id": team_id, "teamName": "Team"}]),
            teamMembers=FakeCollection([{"teamId": str(team_id), "userId": self.student["id"], "role": "leader"}]),
            mentors=FakeCollection([{"_id": ObjectId(), "userId": mentor_user_id, "availability": "Unavailable"}]),
        )
        with patch("routers.team.get_db", return_value=db):
            with self.assertRaises(HTTPException) as raised:
                await team.assign_mentor(str(team_id), team.TeamMentorUpdate(mentorId=mentor_user_id), self.student)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertNotIn("mentorId", db["teams"].documents[0])

    async def test_guidance_request_has_backend_length_validation(self):
        with self.assertRaises(ValidationError):
            team.TeamMentorUpdate(mentorId="mentor", guidanceRequest="x" * 601)

    async def test_team_member_can_upload_and_list_a_real_file(self):
        team_id = ObjectId()
        db = FakeDatabase(
            teams=FakeCollection([{"_id": team_id, "teamName": "Team"}]),
            teamMembers=FakeCollection([{"teamId": str(team_id), "userId": self.student["id"], "role": "leader"}]),
            teamFiles=FakeCollection(),
        )
        service = team_files.file_upload_service
        previous_dir = service.shared_files_dir
        temporary_dir = self.isolated_storage_dir()
        service.shared_files_dir = temporary_dir
        try:
            upload = UploadFile(filename="brief.pdf", file=io.BytesIO(b"%PDF-1.7\nactual file content"))
            with patch("routers.team_files.get_db", return_value=db):
                result = await team_files.upload_team_file(str(team_id), upload, self.student)
                listed = await team_files.list_team_files(str(team_id), self.student)
            self.assertEqual(result["fileName"], "brief.pdf")
            self.assertEqual(result["extension"], "PDF")
            self.assertEqual(len(listed), 1)
            self.assertNotIn("storageName", listed[0])
            self.assertEqual(listed[0]["uploadedBy"], "Team member")
        finally:
            service.shared_files_dir = previous_dir
            self.clear_isolated_storage(temporary_dir)

    async def test_nonmember_cannot_upload_or_download_team_files(self):
        team_id = ObjectId()
        file_id = ObjectId()
        db = FakeDatabase(
            teams=FakeCollection([{"_id": team_id}]),
            teamMembers=FakeCollection(),
            teamFiles=FakeCollection([{"_id": file_id, "teamId": str(team_id), "storageName": "a" * 32 + ".pdf", "fileName": "secret.pdf"}]),
        )
        with patch("routers.team_files.get_db", return_value=db):
            with self.assertRaises(HTTPException) as upload_error:
                await team_files.upload_team_file(str(team_id), UploadFile(filename="brief.pdf", file=io.BytesIO(b"%PDF-1.7")), self.student)
            with self.assertRaises(HTTPException) as download_error:
                await team_files.download_team_file(str(file_id), self.student)
        self.assertEqual(upload_error.exception.status_code, 403)
        self.assertEqual(download_error.exception.status_code, 403)

    async def test_shared_upload_rejects_invalid_type_content_and_oversized_file(self):
        service = team_files.file_upload_service
        with self.assertRaises(HTTPException) as invalid_type:
            await service.save_shared_file(UploadFile(filename="notes.txt", file=io.BytesIO(b"not allowed")))
        with self.assertRaises(HTTPException) as invalid_content:
            await service.save_shared_file(UploadFile(filename="fake.pdf", file=io.BytesIO(b"not a PDF")))
        oversized = UploadFile(filename="large.pdf", file=OversizedUpload(200 * 1024 * 1024 + 1))
        with self.assertRaises(HTTPException) as too_large:
            await service.save_shared_file(oversized)
        self.assertEqual(invalid_type.exception.status_code, 400)
        self.assertEqual(invalid_content.exception.status_code, 400)
        self.assertEqual(too_large.exception.status_code, 413)

    async def test_download_is_authenticated_and_returns_file_response(self):
        team_id = ObjectId()
        file_id = ObjectId()
        service = team_files.file_upload_service
        previous_dir = service.shared_files_dir
        temporary_dir = self.isolated_storage_dir()
        service.shared_files_dir = temporary_dir
        try:
            storage_name, _, _, _ = await service.save_shared_file(UploadFile(filename="brief.pdf", file=io.BytesIO(b"%PDF-1.7\ncontent")))
            db = FakeDatabase(
                teams=FakeCollection([{"_id": team_id}]),
                teamMembers=FakeCollection([{"teamId": str(team_id), "userId": self.student["id"]}]),
                teamFiles=FakeCollection([{"_id": file_id, "teamId": str(team_id), "storageName": storage_name, "fileName": "brief.pdf", "contentType": "application/pdf"}]),
            )
            with patch("routers.team_files.get_db", return_value=db):
                response = await team_files.download_team_file(str(file_id), self.student)
            self.assertIsInstance(response, FileResponse)
            self.assertEqual(Path(response.path).read_bytes(), b"%PDF-1.7\ncontent")
        finally:
            service.shared_files_dir = previous_dir
            self.clear_isolated_storage(temporary_dir)

    async def test_mentor_status_reports_persisted_assignment_as_assigned(self):
        team_id = ObjectId()
        mentor_user_id = str(ObjectId())
        assigned_at = datetime.utcnow()
        db = FakeDatabase(
            teamMembers=FakeCollection([{"teamId": str(team_id), "userId": self.student["id"]}]),
            teams=FakeCollection([{"_id": team_id, "teamName": "Team", "mentorId": mentor_user_id, "mentorAssignedAt": assigned_at, "mentorRequest": {"focusArea": "Product"}}]),
            users=FakeCollection([{"_id": ObjectId(mentor_user_id), "name": "Real Mentor"}]),
        )
        with patch("routers.team.get_db", return_value=db):
            records = await team.get_my_mentor_requests(self.student)
        self.assertEqual(records[0]["status"], "assigned")
        self.assertEqual(records[0]["mentorName"], "Real Mentor")
        self.assertEqual(records[0]["requestedAt"], assigned_at)
        self.assertEqual(records[0]["focusArea"], "Product")

    async def test_team_database_id_cannot_bypass_the_invite_code(self):
        db = FakeDatabase(teams=FakeCollection())
        with patch("routers.team.get_db", return_value=db):
            with self.assertRaises(HTTPException) as raised:
                await team.join_team(str(ObjectId()), self.student)
        self.assertEqual(raised.exception.status_code, 404)

    async def test_chat_write_is_rejected_for_nonmember(self):
        team_id = str(ObjectId())
        db = FakeDatabase(teamMembers=FakeCollection(), chats=FakeCollection())
        with patch("routers.chat.get_db", return_value=db):
            with self.assertRaises(HTTPException) as raised:
                await chat.send_team_message(team_id, {"content": "hello"}, self.student)
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(db["chats"].documents, [])

    async def test_chat_write_persists_and_broadcasts_for_member(self):
        team_id = str(ObjectId())
        db = FakeDatabase(
            teamMembers=FakeCollection([{"teamId": team_id, "userId": self.student["id"]}]),
            chats=FakeCollection(),
        )
        with patch("routers.chat.get_db", return_value=db), patch.object(
            chat.manager, "broadcast_to_team", new_callable=AsyncMock
        ) as broadcast:
            result = await chat.send_team_message(team_id, {"content": "hello"}, self.student)
        self.assertEqual(result.content, "hello")
        self.assertEqual(len(db["chats"].documents), 1)
        broadcast.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
