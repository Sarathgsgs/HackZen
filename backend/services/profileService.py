from typing import Optional, Dict, Any, List
from bson import ObjectId
from datetime import datetime


class ProfileService:
    @staticmethod
    async def get_profile(user_id: str, role: str, db) -> Optional[Dict[str, Any]]:
        collection_map = {
            "student": db.students,
            "mentor": db.mentors,
            "organizer": db.organizers,
            "admin": db.admins,
        }
        collection = collection_map.get(role)

        if collection is None:
            return None

        profile = await collection.find_one({"userId": user_id})
        if profile:
            profile["_id"] = str(profile["_id"])
            profile["role"] = role  # Ensure role is included for discriminator
            if "userId" in profile:
                profile["userId"] = str(profile["userId"])

            # Fetch name from the core users collection
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                profile["name"] = user.get("name")
        else:
            return None
        return profile

    @staticmethod
    async def get_user_with_profile(user_id: str, db) -> Dict[str, Any]:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError(f"User with ID {user_id} not found")

        user["_id"] = str(user["_id"])
        role = user.get("role")

        # get_profile already handles ID to string conversion
        profile = await ProfileService.get_profile(user_id, role, db)

        response = {
            "_id": user["_id"],
            "name": str(user.get("name", "")),
            "email": str(user.get("email", "")),
            "role": role,
            "profile": profile,
        }

        # Add role-specific key for frontend compatibility
        if role:
            response[f"{role}_profile"] = profile

        return response

    @staticmethod
    async def update_profile(
        user_id: str, role: str, profile_data: Dict[str, Any], db
    ) -> Optional[Dict[str, Any]]:
        print(
            f"[DEBUG ProfileService] Updating profile for user: {user_id}, role: {role}"
        )
        print(f"[DEBUG ProfileService] Update data: {profile_data}")

        collection_map = {
            "student": db.students,
            "mentor": db.mentors,
            "organizer": db.organizers,
            "admin": db.admins,
        }
        collection = collection_map.get(role)
        if collection is None:
            print(
                f"[DEBUG ProfileService] ERROR: Collection not found for role: {role}"
            )
            return None

        # Prepare update data
        update_data = profile_data.copy()

        # 1. Update name in users collection if provided
        if "name" in update_data:
            name = update_data.pop("name")
            if name is not None:
                print(
                    f"[DEBUG ProfileService] Updating name in users collection: {name}"
                )
                result = await db.users.update_one(
                    {"_id": ObjectId(user_id)}, {"$set": {"name": name}}
                )
                print(
                    f"[DEBUG ProfileService] Name update result: modified={result.modified_count}"
                )

        # 2. Ensure profile document exists and is updated
        now = datetime.utcnow()
        update_data["updatedAt"] = now

        # Use upsert to handle both creation and updates
        print(f"[DEBUG ProfileService] Updating {role} profile in collection...")
        result = await collection.update_one(
            {"userId": user_id},
            {"$set": update_data, "$setOnInsert": {"createdAt": now}},
            upsert=True,
        )
        print(
            f"[DEBUG ProfileService] Update result: matched={result.matched_count}, modified={result.modified_count}, upserted_id={result.upserted_id}"
        )

        profile = await ProfileService.get_profile(user_id, role, db)
        print(f"[DEBUG ProfileService] Retrieved updated profile: {profile}")
        return profile

    @staticmethod
    async def get_available_mentors(
        db, domain: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = {"availability": "Available"}
        if domain:
            query["expertiseDomains"] = {"$in": [domain]}

        cursor = db.mentors.find(query)
        mentors = await cursor.to_list(100)

        result = []
        for m in mentors:
            m["_id"] = str(m["_id"])
            if "userId" in m:
                m["userId"] = str(m["userId"])
                # A hidden contact number is never included in mentor listings
                # that are consumed by teams and other public-facing pages.
                preferences = await db.user_settings.find_one(
                    {"userId": m["userId"]}, {"mentor.contactNumberVisibility": 1}
                )
                if (preferences or {}).get("mentor", {}).get("contactNumberVisibility") == "hidden":
                    m.pop("phoneNumber", None)
                # Fetch name from user collection
                user = await db.users.find_one({"_id": ObjectId(m["userId"])})
                if user:
                    m["name"] = user.get("name")
            result.append(m)
        return result
