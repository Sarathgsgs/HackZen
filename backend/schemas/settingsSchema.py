from pydantic import BaseModel, Field, validator
from typing import Optional
from enum import Enum


class ProfileModeEnum(str, Enum):
    PUBLIC = "Public"
    PRIVATE = "Private"
    CONNECTIONS_ONLY = "Connections Only"


class ThemeEnum(str, Enum):
    PURPLE_DARK = "Purple Dark"
    LIGHT = "Light"
    AUTO = "Auto"


class ContentLanguageEnum(str, Enum):
    ENGLISH_US = "English (US)"
    ENGLISH_GB = "English (GB)"
    SPANISH = "Spanish"
    FRENCH = "French"
    GERMAN = "German"
    PORTUGUESE = "Portuguese"
    CHINESE = "Chinese"
    JAPANESE = "Japanese"


class NotificationFrequencyEnum(str, Enum):
    INSTANT = "Instant"
    DAILY = "Daily"
    WEEKLY = "Weekly"
    NEVER = "Never"


class SettingsBase(BaseModel):
    profileMode: ProfileModeEnum = ProfileModeEnum.PUBLIC
    emailNotifications: bool = True
    pushNotifications: bool = False
    theme: ThemeEnum = ThemeEnum.PURPLE_DARK
    accessibilityMode: bool = False
    contentLanguage: ContentLanguageEnum = ContentLanguageEnum.ENGLISH_US
    twoFactorEnabled: bool = False
    dataSharing: bool = True
    allowTeamInvitations: bool = True
    notificationFrequency: NotificationFrequencyEnum = NotificationFrequencyEnum.INSTANT


class SettingsCreate(SettingsBase):
    pass


class SettingsUpdate(BaseModel):
    profileMode: Optional[ProfileModeEnum] = None
    emailNotifications: Optional[bool] = None
    pushNotifications: Optional[bool] = None
    theme: Optional[ThemeEnum] = None
    accessibilityMode: Optional[bool] = None
    contentLanguage: Optional[ContentLanguageEnum] = None
    twoFactorEnabled: Optional[bool] = None
    dataSharing: Optional[bool] = None
    allowTeamInvitations: Optional[bool] = None
    notificationFrequency: Optional[NotificationFrequencyEnum] = None


class SettingsResponse(SettingsBase):
    id: str = Field(..., alias="_id")
    userId: str = Field(..., alias="userId")
    createdAt: str = Field(..., alias="createdAt")
    updatedAt: str = Field(..., alias="updatedAt")

    model_config = {"populate_by_name": True, "from_attributes": True}


class PasswordChangeRequest(BaseModel):
    currentPassword: str = Field(..., min_length=1)
    newPassword: str = Field(..., min_length=8)
    confirmPassword: str = Field(..., min_length=8)

    @validator("newPassword")
    def validate_password_strength(cls, v):
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)

        if not (has_upper and has_lower and has_digit):
            raise ValueError(
                "Password must contain uppercase, lowercase, and numeric characters"
            )
        return v

    @validator("confirmPassword")
    def passwords_match(cls, v, values):
        if "newPassword" in values and v != values["newPassword"]:
            raise ValueError("Passwords do not match")
        return v


class PasswordChangeResponse(BaseModel):
    success: bool
    message: str


class DefaultSettingsResponse(SettingsBase):
    pass
