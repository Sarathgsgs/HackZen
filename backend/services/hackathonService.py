from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
import uuid
from database import get_hackathon_collection
from models.hackathonModel import HackathonStatus, HackathonTheme
from schemas.hackathonSchema import HackathonCreate, HackathonUpdate
from services.file_upload import file_upload_service


class HackathonService:
    @staticmethod
    async def create_hackathon(
        organizer_id: str,
        data: HackathonCreate,
        db,
        poster: Optional[Any] = None,
        template: Optional[Any] = None,
    ) -> Dict[str, Any]:
        coll = db.hackathons
        now = datetime.utcnow()

        # Convert Pydantic model to dict
        hackathon_dict = data.model_dump(by_alias=True, exclude_unset=True)

        # Handle enum serialization
        if "themes" in hackathon_dict and hackathon_dict["themes"]:
            hackathon_dict["themes"] = [
                t.value if hasattr(t, "value") else t for t in hackathon_dict["themes"]
            ]

        if "status" in hackathon_dict:
            status_val = hackathon_dict["status"]
            if hasattr(status_val, "value"):
                hackathon_dict["status"] = status_val.value
            else:
                hackathon_dict["status"] = str(status_val)

        saved_paths = []
        if poster and hasattr(poster, "filename") and poster.filename:
            poster_path, poster_url = await file_upload_service.save_poster(poster)
            saved_paths.append(poster_path)
            hackathon_dict["posterUrl"] = poster_url

        if template and hasattr(template, "filename") and template.filename:
            template_path, template_url = await file_upload_service.save_template(
                template
            )
            saved_paths.append(template_path)
            hackathon_dict["templateUrl"] = template_url

        # Add metadata
        hackathon_dict.update(
            {"organizerId": organizer_id, "createdAt": now, "updatedAt": now}
        )

        try:
            result = await coll.insert_one(hackathon_dict)
        except Exception:
            for path in saved_paths:
                file_upload_service.delete_file(path)
            raise

        hackathon_dict["_id"] = str(result.inserted_id)

        print(f"DEBUG: Hackathon created successfully with ID: {hackathon_dict['_id']}")
        return hackathon_dict

    @staticmethod
    def _normalize_hackathon(h: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.utcnow()
        h_id = str(h.get("_id") or h.get("id") or "")
        h["_id"] = h_id
        h["id"] = h_id

        # Normalize Dates with robust fallbacks
        start_d = (
            h.get("registrationStart")
            or h.get("registration_start")
            or h.get("startDate")
            or h.get("start_date")
            or h.get("createdAt")
            or now
        )
        end_d = (
            h.get("registrationEnd")
            or h.get("registration_end")
            or h.get("submissionDeadline")
            or h.get("endDate")
            or h.get("end_date")
            or now
        )
        h_start = (
            h.get("hackathonStart")
            or h.get("hackathon_start")
            or h.get("startDate")
            or h.get("start_date")
            or now
        )
        h_end = (
            h.get("hackathonEnd")
            or h.get("hackathon_end")
            or h.get("endDate")
            or h.get("end_date")
            or now
        )

        h["registrationStart"] = start_d
        h["registrationEnd"] = end_d
        h["hackathonStart"] = h_start
        h["hackathonEnd"] = h_end
        h["startDate"] = h.get("startDate") or (
            str(h_start)[:10] if isinstance(h_start, datetime) else str(h_start)
        )
        h["endDate"] = h.get("endDate") or (
            str(h_end)[:10] if isinstance(h_end, datetime) else str(h_end)
        )

        h["organizerId"] = str(h.get("organizerId") or "65e020000000000000000001")
        h["createdAt"] = h.get("createdAt") or now
        h["updatedAt"] = h.get("updatedAt") or now

        # Normalize themes list
        if not h.get("themes"):
            if h.get("theme"):
                h["themes"] = [h.get("theme")]
            elif h.get("category"):
                h["themes"] = [h.get("category")]
            else:
                h["themes"] = ["Web Dev"]
        elif isinstance(h["themes"], str):
            h["themes"] = [h["themes"]]

        return h

    @staticmethod
    async def get_hackathon_by_id(hid: str, db) -> Optional[Dict[str, Any]]:
        coll = db.hackathons
        if not ObjectId.is_valid(hid):
            return None
        hackathon = await coll.find_one({"_id": ObjectId(hid)})
        if hackathon:
            return HackathonService._normalize_hackathon(hackathon)
        return None

    @staticmethod
    async def get_all_hackathons(
        db, filters: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        coll = db.hackathons
        query = filters or {}

        cursor = coll.find(query).sort("createdAt", -1)
        hackathons = await cursor.to_list(100)

        for h in hackathons:
            h_id = str(h["_id"])
            HackathonService._normalize_hackathon(h)

            # Add participant count
            h["participants_count"] = await db.applications.count_documents(
                {"hackathonId": h_id}
            )

            # Join organizer user details
            org_id = h.get("organizerId")
            if org_id and ObjectId.is_valid(str(org_id)):
                org_user = await db.users.find_one(
                    {"_id": ObjectId(str(org_id))}, {"password": 0}
                )
            elif org_id:
                org_user = await db.users.find_one(
                    {"_id": str(org_id)}, {"password": 0}
                )
            else:
                org_user = None

            if org_user:
                h["organizerName"] = org_user.get(
                    "name", org_user.get("email", "Platform Organizer").split("@")[0]
                )
                h["organization"] = org_user.get(
                    "organization", org_user.get("college", "HackZen Partner Org")
                )
            else:
                h["organizerName"] = h.get("organizerName", "Platform Organizer")
                h["organization"] = h.get("organization", "HackZen Community")

        return hackathons

    @staticmethod
    async def update_hackathon(
        hid: str,
        organizer_id: str,
        user_role: str,
        data: HackathonUpdate,
        db,
        poster: Optional[Any] = None,
        template: Optional[Any] = None,
    ) -> Optional[Dict[str, Any]]:
        coll = db.hackathons

        if not ObjectId.is_valid(hid):
            return None

        query = {"_id": ObjectId(hid)}

        # Verify ownership
        existing = await coll.find_one(query)
        if not existing:
            return None

        # Allow if it's the owner OR an admin
        if existing["organizerId"] != organizer_id and user_role != "admin":
            raise PermissionError("Not authorized to update this hackathon")

        update_data = data.model_dump(exclude_unset=True, by_alias=True)

        # --- MongoDB Serialization for Updates ---
        if "themes" in update_data and update_data["themes"]:
            update_data["themes"] = [
                t.value if hasattr(t, "value") else t for t in update_data["themes"]
            ]

        if "status" in update_data:
            status_val = update_data["status"]
            if hasattr(status_val, "value"):
                status_val = status_val.value

            if str(status_val).lower() in [
                "open",
                "registration_open",
                "registration open",
            ]:
                update_data["status"] = HackathonStatus.REGISTRATION_OPEN.value
            else:
                update_data["status"] = status_val

        # Save files if provided
        if poster and hasattr(poster, "filename") and poster.filename:
            _, poster_url = await file_upload_service.save_poster(poster)
            update_data["posterUrl"] = poster_url

        if template and hasattr(template, "filename") and template.filename:
            _, template_url = await file_upload_service.save_template(template)
            update_data["templateUrl"] = template_url

        update_data["updatedAt"] = datetime.utcnow()

        await coll.update_one(query, {"$set": update_data})
        return await HackathonService.get_hackathon_by_id(hid, db)

    @staticmethod
    async def delete_hackathon(hid: str, organizer_id: str, user_role: str, db) -> bool:
        coll = db.hackathons

        if not ObjectId.is_valid(hid):
            return False

        query = {"_id": ObjectId(hid)}

        existing = await coll.find_one(query)
        if not existing:
            return False

        # Allow if it's the owner OR an admin
        if existing["organizerId"] != organizer_id and user_role != "admin":
            raise PermissionError("Not authorized to delete this hackathon")

        await coll.delete_one(query)
        return True

    @staticmethod
    async def get_organizer_hackathons(organizer_id: str, db) -> List[Dict[str, Any]]:
        coll = db.hackathons
        cursor = coll.find({"organizerId": organizer_id}).sort("createdAt", -1)
        hackathons = await cursor.to_list(100)

        for h in hackathons:
            HackathonService._normalize_hackathon(h)
        return hackathons
