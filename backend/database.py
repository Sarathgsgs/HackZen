from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import os
import pymongo
from pymongo.errors import ConnectionFailure
from core.config import settings
import certifi
from urllib.parse import urlparse


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls):
        try:
            mongo_uri = settings.MONGO_URI or "mongodb://127.0.0.1:27017"
            db_name = settings.DB_NAME or "hackzen"
            parsed = urlparse(mongo_uri)

            connect_kwargs = {
                "maxPoolSize": 100,
                "minPoolSize": 10,
                "serverSelectionTimeoutMS": 5000,
            }

            tls_enabled = os.getenv("MONGO_TLS", "").lower() in {"1", "true", "yes"} or any(
                k in mongo_uri.lower() for k in ["mongodb+srv", "ssl=true", "tls=true"]
            )
            if parsed.scheme == "mongodb+srv" or tls_enabled:
                connect_kwargs["tls"] = True
                connect_kwargs["tlsCAFile"] = certifi.where()

            cls.client = AsyncIOMotorClient(mongo_uri, **connect_kwargs)
            await cls.client.admin.command("ping")
            cls.db = cls.client[db_name]
            print(f"[DB] Connected to MongoDB ({db_name})")

            await cls.create_indexes()

        except ConnectionFailure as e:
            print(f"[DB] MongoDB connection failed: {e}")
            raise

    @classmethod
    async def create_indexes(cls):
        # Clean up old problematic indexes
        try:
            await cls.db.users.drop_index("uid_1")
        except Exception:
            pass  # Ignore if it doesn't exist
        try:
            await cls.db.teams.drop_index("team_code_1")
        except Exception:
            pass  # Ignore if it doesn't exist

        await cls.db.users.create_index([("email", pymongo.ASCENDING)], unique=True)
        await cls.db.users.create_index([("role", pymongo.ASCENDING)])

        # Profile collections
        await cls.db.students.create_index([("userId", pymongo.ASCENDING)], unique=True)
        await cls.db.mentors.create_index([("userId", pymongo.ASCENDING)], unique=True)
        await cls.db.organizers.create_index(
            [("userId", pymongo.ASCENDING)], unique=True
        )
        await cls.db.user_settings.create_index(
            [("userId", pymongo.ASCENDING)], unique=True
        )

        # Hackathons collection
        await cls.db.hackathons.create_index([("organizerId", pymongo.ASCENDING)])
        await cls.db.hackathons.create_index([("status", pymongo.ASCENDING)])

        # Teams collection
        await cls.db.teams.create_index([("teamCode", pymongo.ASCENDING)], unique=True)
        await cls.db.teams.create_index([("hackathonId", pymongo.ASCENDING)])
        await cls.db.teams.create_index(
            [("hackathonId", pymongo.ASCENDING), ("teamName", pymongo.ASCENDING)],
            unique=True,
        )
        await cls.db.teams.create_index([("createdBy", pymongo.ASCENDING)])
        await cls.db.teams.create_index([("mentorId", pymongo.ASCENDING)])

        # Team Members
        await cls.db.teamMembers.create_index(
            [("teamId", pymongo.ASCENDING), ("userId", pymongo.ASCENDING)], unique=True
        )

        # Queries run by the reminder worker and the per-user inbox.
        await cls.db.meetings.create_index([("startTime", pymongo.ASCENDING), ("reminderSentAt", pymongo.ASCENDING)])
        await cls.db.notifications.create_index([("userId", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)])
        await cls.db.mentorRequests.create_index([("mentorId", pymongo.ASCENDING), ("status", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)])
        await cls.db.feedback.create_index([("mentorId", pymongo.ASCENDING), ("teamId", pymongo.ASCENDING), ("status", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)])
        await cls.db.teamMaterials.create_index([("teamId", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)])
        await cls.db.teamMaterials.create_index([("uploadedBy", pymongo.ASCENDING)])

        # Applications
        await cls.db.applications.create_index(
            [("hackathonId", pymongo.ASCENDING), ("userId", pymongo.ASCENDING)],
            unique=True,
        )

        # Chat messages
        await cls.db.chats.create_index(
            [("teamId", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)]
        )

        # Progress tracking
        await cls.db.progress.create_index([("teamId", pymongo.ASCENDING)], unique=True)
        await cls.db.milestoneProgress.create_index(
            [("progressId", pymongo.ASCENDING), ("milestoneId", pymongo.ASCENDING)],
            unique=True,
        )

        print("[DB] MongoDB indexes created")

    @classmethod
    async def disconnect(cls):
        if cls.client:
            cls.client.close()
            print("[DB] Disconnected from MongoDB")

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        if cls.db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return cls.db


def get_db() -> AsyncIOMotorDatabase:
    return MongoDB.get_db()


def get_user_collection():
    return MongoDB.get_db().users


def get_hackathon_collection():
    return MongoDB.get_db().hackathons


def get_team_collection():
    return MongoDB.get_db().teams


def get_chat_collection():
    return MongoDB.get_db().chat_messages


def get_progress_collection():
    return MongoDB.get_db().progress


def get_ai_embeddings_collection():
    return MongoDB.get_db().ai_embeddings


def get_certificates_collection():
    return MongoDB.get_db().certificates


def get_notifications_collection():
    return MongoDB.get_db().notifications


def get_mentor_allocations_collection():
    return MongoDB.get_db().mentor_allocations


def get_milestones_collection():
    return MongoDB.get_db().milestones
