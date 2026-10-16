import unittest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

from bson import ObjectId
from fastapi import HTTPException

from routers import application, hackathonRoutes
from schemas.application import ApplicationCreate
from schemas.hackathonSchema import HackathonResponse


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = list(documents or [])

    async def find_one(self, query, *_args, **_kwargs):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return document
        return None

    async def count_documents(self, query):
        return sum(all(document.get(key) == value for key, value in query.items()) for document in self.documents)

    async def insert_one(self, document):
        stored = dict(document)
        stored.setdefault("_id", ObjectId())
        self.documents.append(stored)
        return type("InsertResult", (), {"inserted_id": stored["_id"]})()


class FakeDatabase:
    def __init__(self, **collections):
        self.collections = collections

    def __getitem__(self, name):
        return self.collections.setdefault(name, FakeCollection())


class HackathonApplicationRulesTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.student_id = str(ObjectId())
        self.hackathon_id = str(ObjectId())
        now = datetime.utcnow()
        self.hackathon = {
            "_id": ObjectId(self.hackathon_id),
            "isPublic": True,
            "status": "Registration Open",
            "registrationStart": now - timedelta(days=1),
            "registrationEnd": now + timedelta(days=1),
            "minTeamSize": 2,
            "maxTeamSize": 4,
        }
        self.db = FakeDatabase(hackathons=FakeCollection([self.hackathon]), applications=FakeCollection())
        self.student = {"sub": self.student_id, "role": "student"}

    async def submit(self, **fields):
        data = ApplicationCreate(hackathonId=self.hackathon_id, **fields)
        with patch("routers.application.get_db", return_value=self.db):
            return await application.create_application(data, self.student)

    async def test_valid_registration_persists_authenticated_user_and_team_size(self):
        created = await self.submit(teamName="Real Project Team", teamSize=3)
        self.assertEqual(created.userId, self.student_id)
        self.assertEqual(created.teamName, "Real Project Team")
        self.assertEqual(created.teamSize, 3)
        self.assertEqual(len(self.db["applications"].documents), 1)

    async def test_registration_rejects_before_open_and_after_deadline(self):
        self.hackathon["registrationStart"] = datetime.utcnow() + timedelta(days=1)
        with self.assertRaises(HTTPException) as early:
            await self.submit(teamSize=2)
        self.assertEqual(early.exception.status_code, 400)

        self.hackathon["registrationStart"] = datetime.utcnow() - timedelta(days=1)
        self.hackathon["registrationEnd"] = datetime.utcnow() - timedelta(seconds=1)
        with self.assertRaises(HTTPException) as late:
            await self.submit(teamSize=2)
        self.assertEqual(late.exception.status_code, 400)
        self.assertEqual(self.db["applications"].documents, [])

    async def test_registration_rejects_team_size_outside_hackathon_limits(self):
        with self.assertRaises(HTTPException) as raised:
            await self.submit(teamSize=5)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(self.db["applications"].documents, [])

    async def test_student_cannot_register_a_team_they_do_not_belong_to(self):
        with self.assertRaises(HTTPException) as raised:
            await self.submit(teamId=str(ObjectId()), teamSize=2)
        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(self.db["applications"].documents, [])

    async def test_duplicate_registration_is_rejected(self):
        self.db["applications"].documents.append({"hackathonId": self.hackathon_id, "userId": self.student_id})
        with self.assertRaises(HTTPException) as raised:
            await self.submit(teamSize=2)
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(len(self.db["applications"].documents), 1)


class HackathonDetailsTests(unittest.IsolatedAsyncioTestCase):
    async def test_details_endpoint_returns_the_requested_public_event_and_available_fields(self):
        organizer_id = str(ObjectId())
        organizer = {"_id": ObjectId(organizer_id), "name": "Real Organizer"}
        db = FakeDatabase(users=FakeCollection([organizer]))
        event_ids = [str(ObjectId()), str(ObjectId())]
        events = [
            {
                "_id": event_id,
                "organizerId": organizer_id,
                "title": f"Event {index}",
                "description": "Backend supplied description",
                "themes": ["AIML"],
                "isPublic": True,
                "status": "Upcoming",
                "registrationStart": datetime.utcnow(),
                "registrationEnd": datetime.utcnow() + timedelta(days=2),
                "hackathonStart": datetime.utcnow() + timedelta(days=3),
                "hackathonEnd": datetime.utcnow() + timedelta(days=4),
                "minTeamSize": 1,
                "maxTeamSize": 4,
                "maxTeams": 20,
                "prizes": [{"title": "First place", "amount": "$1,000"}],
                "resources": [{"title": "Brief", "url": "https://example.invalid/brief"}],
                "rules": ["Submit original work"],
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            }
            for index, event_id in enumerate(event_ids, start=1)
        ]
        with patch("routers.hackathonRoutes.get_db", return_value=db), patch.object(
            hackathonRoutes.HackathonService, "get_hackathon_by_id", new_callable=AsyncMock
        ) as fetch_event:
            for expected, event in zip(events, event_ids):
                fetch_event.return_value = expected
                result = await hackathonRoutes.get_hackathon(event, {"role": "student"})
                response = HackathonResponse.model_validate(result)
                self.assertEqual(response.id, event)
                self.assertEqual(response.title, expected["title"])
                self.assertEqual(response.organizerName, "Real Organizer")
                self.assertEqual(response.prizes, expected["prizes"])
                self.assertEqual(response.resources, expected["resources"])

    async def test_students_cannot_load_private_or_draft_event_details(self):
        event_id = str(ObjectId())
        for changes in ({"isPublic": False}, {"status": "Draft"}):
            event = {"_id": event_id, "isPublic": True, "status": "Upcoming", **changes}
            with patch("routers.hackathonRoutes.get_db", return_value=FakeDatabase()), patch.object(
                hackathonRoutes.HackathonService, "get_hackathon_by_id", new_callable=AsyncMock, return_value=event
            ):
                with self.assertRaises(HTTPException) as raised:
                    await hackathonRoutes.get_hackathon(event_id, {"role": "student"})
            self.assertEqual(raised.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
