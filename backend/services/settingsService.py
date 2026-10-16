from datetime import datetime
from bson import ObjectId
from core.security import verify_password, get_password_hash
from models.settingsModel import StudentSettings
from schemas.settingsSchema import SettingsUpdate, PasswordChangeRequest
from typing import Dict, Any, Optional


class SettingsService:
    """Service for managing user settings"""

    # Default settings template
    DEFAULT_SETTINGS = {
        "profileMode": "Public",
        "emailNotifications": True,
        "pushNotifications": False,
        "theme": "Purple Dark",
        "accessibilityMode": False,
        "contentLanguage": "English (US)",
        "twoFactorEnabled": False,
        "dataSharing": True,
        "allowTeamInvitations": True,
        "notificationFrequency": "Instant",
    }

    @staticmethod
    async def get_settings(user_id: str, db) -> Dict[str, Any]:
        """
        Fetch user settings from database.
        If settings don't exist, create and return default settings.
        """
        try:
            # Try to find existing settings
            settings = await db["student_settings"].find_one({"userId": user_id})

            if settings:
                # Convert ObjectId to string for response
                settings["_id"] = str(settings["_id"])
                return settings

            # If no settings exist, create defaults
            return await SettingsService.create_default_settings(user_id, db)

        except Exception as e:
            print(f"[ERROR] Failed to get settings for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def create_default_settings(user_id: str, db) -> Dict[str, Any]:
        """
        Create default settings for a new user.
        """
        try:
            now = datetime.utcnow()
            default_doc = {
                "_id": ObjectId(),
                "userId": user_id,
                **SettingsService.DEFAULT_SETTINGS,
                "createdAt": now,
                "updatedAt": now,
            }

            result = await db["student_settings"].insert_one(default_doc)

            # Return the created document
            created_settings = await db["student_settings"].find_one(
                {"_id": result.inserted_id}
            )
            created_settings["_id"] = str(created_settings["_id"])
            return created_settings

        except Exception as e:
            print(f"[ERROR] Failed to create default settings: {str(e)}")
            raise

    @staticmethod
    async def update_settings(
        user_id: str, updates: Dict[str, Any], db
    ) -> Dict[str, Any]:
        """
        Update specific settings for a user.
        Validates enum values before updating.
        """
        try:
            # Ensure settings exist
            existing = await db["student_settings"].find_one({"userId": user_id})
            if not existing:
                return await SettingsService.create_default_settings(user_id, db)

            # Filter out None values
            update_dict = {k: v for k, v in updates.items() if v is not None}

            # Validate enum values
            if "profileMode" in update_dict:
                valid_modes = ["Public", "Private", "Connections Only"]
                if update_dict["profileMode"] not in valid_modes:
                    raise ValueError(
                        f"Invalid profileMode. Must be one of: {valid_modes}"
                    )

            if "theme" in update_dict:
                valid_themes = ["Purple Dark", "Light", "Auto"]
                if update_dict["theme"] not in valid_themes:
                    raise ValueError(
                        f"Invalid theme. Must be one of: {valid_themes}"
                    )

            if "contentLanguage" in update_dict:
                valid_languages = [
                    "English (US)",
                    "English (GB)",
                    "Spanish",
                    "French",
                    "German",
                    "Portuguese",
                    "Chinese",
                    "Japanese",
                ]
                if update_dict["contentLanguage"] not in valid_languages:
                    raise ValueError(
                        f"Invalid contentLanguage. Must be one of: {valid_languages}"
                    )

            if "notificationFrequency" in update_dict:
                valid_frequencies = ["Instant", "Daily", "Weekly", "Never"]
                if update_dict["notificationFrequency"] not in valid_frequencies:
                    raise ValueError(
                        f"Invalid notificationFrequency. Must be one of: {valid_frequencies}"
                    )

            # Add updatedAt timestamp
            update_dict["updatedAt"] = datetime.utcnow()

            # Update the document
            result = await db["student_settings"].find_one_and_update(
                {"userId": user_id},
                {"$set": update_dict},
                return_document=True,
            )

            if result:
                result["_id"] = str(result["_id"])
            return result

        except ValueError as ve:
            print(f"[VALIDATION ERROR] {str(ve)}")
            raise
        except Exception as e:
            print(f"[ERROR] Failed to update settings for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def reset_settings(user_id: str, db) -> Dict[str, Any]:
        """
        Reset user settings to defaults.
        """
        try:
            now = datetime.utcnow()
            reset_doc = {
                **SettingsService.DEFAULT_SETTINGS,
                "updatedAt": now,
            }

            result = await db["student_settings"].find_one_and_update(
                {"userId": user_id},
                {"$set": reset_doc},
                return_document=True,
            )

            if not result:
                # If settings don't exist, create them
                return await SettingsService.create_default_settings(user_id, db)

            result["_id"] = str(result["_id"])
            return result

        except Exception as e:
            print(f"[ERROR] Failed to reset settings for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def change_password(
        user_id: str, password_request: PasswordChangeRequest, db
    ) -> Dict[str, Any]:
        """
        Change user password.
        Validates current password before allowing change.
        """
        try:
            # Fetch user from database
            user = await db["users"].find_one({"_id": ObjectId(user_id)})

            if not user:
                raise ValueError("User not found")

            # Verify current password
            if not verify_password(
                password_request.currentPassword, user.get("passwordHash", "")
            ):
                raise ValueError("Current password is incorrect")

            # Hash new password
            hashed_password = get_password_hash(password_request.newPassword)

            # Update password in database
            await db["users"].find_one_and_update(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "passwordHash": hashed_password,
                        "updatedAt": datetime.utcnow(),
                    }
                },
                return_document=True,
            )

            return {
                "success": True,
                "message": "Password changed successfully",
                "updatedAt": datetime.utcnow().isoformat(),
            }

        except ValueError as ve:
            print(f"[VALIDATION ERROR] {str(ve)}")
            raise
        except Exception as e:
            print(f"[ERROR] Failed to change password for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def deactivate_account(user_id: str, db) -> Dict[str, Any]:
        """
        Soft delete user account (mark as inactive instead of hard delete).
        Also updates settings to reflect deactivation.
        """
        try:
            now = datetime.utcnow()

            # Mark user as inactive
            await db["users"].find_one_and_update(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "isActive": False,
                        "deactivatedAt": now,
                        "updatedAt": now,
                    }
                },
                return_document=True,
            )

            # Update settings to reflect deactivation
            await db["student_settings"].find_one_and_update(
                {"userId": user_id},
                {
                    "$set": {
                        "profileMode": "Private",
                        "twoFactorEnabled": False,
                        "updatedAt": now,
                    }
                },
            )

            return {
                "success": True,
                "message": "Account has been deactivated. Your data will be retained for 30 days before permanent deletion.",
                "deactivatedAt": now.isoformat(),
            }

        except Exception as e:
            print(f"[ERROR] Failed to deactivate account for user {user_id}: {str(e)}")
            raise

    @staticmethod
    async def get_default_settings() -> Dict[str, Any]:
        """
        Return the default settings template.
        Useful for frontend to know what settings are available.
        """
        return SettingsService.DEFAULT_SETTINGS
