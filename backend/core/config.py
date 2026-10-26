from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional, Union, Any
import os
import json
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # App
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: Optional[str] = os.getenv("BACKEND_URL", "http://localhost:8000")
    APP_NAME: str = os.getenv("APP_NAME", "ProEduvate Hackathon Platform")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ALLOW_MOCK_AUTH: bool = False

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    LOG_LEVEL: str = "INFO"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_setting(cls, value):
        if isinstance(value, bool):
            return value
        normalized = str(value).strip().lower()
        if normalized in {"true", "1", "yes", "on", "debug", "development", "dev"}:
            return True
        if normalized in {"false", "0", "no", "off", "release", "production", "prod", ""}:
            return False
        return False

    # File Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey_proeduvate_hackathon_platform_2026")
    ALGORITHM: str = "HS256"
    JWT_EXPIRES_IN: str = os.getenv("JWT_EXPIRES_IN", "30")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ISSUER: str = "proeduvate"
    JWT_AUDIENCE: str = "proeduvate-users"
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DB_NAME: str = os.getenv("DB_NAME", "hackathon_db")

    # AI Services
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    NVIDIA_API_KEY: Optional[str] = os.getenv(
        "NVIDIA_API_KEY",
        "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"
    )

    # OAuth Provider Configurations
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
    GITHUB_CLIENT_ID: Optional[str] = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: Optional[str] = os.getenv("GITHUB_CLIENT_SECRET")
    LINKEDIN_CLIENT_ID: Optional[str] = os.getenv("LINKEDIN_CLIENT_ID")
    LINKEDIN_CLIENT_SECRET: Optional[str] = os.getenv("LINKEDIN_CLIENT_SECRET")

    # Application URLs
    BACKEND_URL: Optional[str] = os.getenv("BACKEND_URL", "http://localhost:8000")
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL", "http://localhost:5173")
    OAUTH_REDIRECT_BASE_URL: Optional[str] = os.getenv(
        "OAUTH_REDIRECT_BASE_URL",
        "https://hackzen-backend.onrender.com"
    )

    # Email
    SMTP_HOST: Optional[str] = (
        os.getenv("SMTP_HOST")
        or os.getenv("MAIL_SERVER")
        or "smtp.gmail.com"
    )
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = (
        os.getenv("SMTP_USER")
        or os.getenv("MAIL_USERNAME")
        or "gsgssarath2005@gmail.com"
    )
    SMTP_PASSWORD: Optional[str] = (
        os.getenv("SMTP_PASSWORD")
        or os.getenv("MAIL_PASSWORD")
        or "kcgq quui mdpg quvm"
    )
    EMAIL_FROM: Optional[str] = (
        os.getenv("EMAIL_FROM")
        or os.getenv("MAIL_FROM")
        or os.getenv("SMTP_USER")
        or os.getenv("MAIL_USERNAME")
        or "gsgssarath2005@gmail.com"
    )

    @field_validator("SMTP_PORT", mode="before")
    @classmethod
    def parse_smtp_port(cls, value):
        if value is None or str(value).strip() == "":
            return 587
        try:
            return int(value)
        except (ValueError, TypeError):
            return 587

    # CORS
    # Defined as Union[List[str], str] so pydantic-settings does not attempt json.loads() on plain URL strings
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "https://hack-zen-ten.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        default_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
            "https://hack-zen-ten.vercel.app",
        ]
        if value is None:
            return default_origins
        if isinstance(value, list):
            res = [str(v).strip() for v in value if str(v).strip()]
            return res or default_origins
        if isinstance(value, str):
            v_str = value.strip()
            if not v_str:
                return default_origins
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    parsed = json.loads(v_str)
                    if isinstance(parsed, list):
                        res = [str(x).strip() for x in parsed if str(x).strip()]
                        return res or default_origins
                except Exception:
                    pass
            parts = [p.strip() for p in v_str.split(",") if p.strip()]
            return parts or default_origins
        return default_origins

    # Vector Database
    VECTOR_DB_URL: Optional[str] = None
    VECTOR_DB_COLLECTION: Optional[str] = None

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [str(self.CORS_ORIGINS)]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
