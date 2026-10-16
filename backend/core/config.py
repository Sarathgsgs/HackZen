from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # App
    FRONTEND_URL: str = os.getenv("FRONTEND_URL")
    BACKEND_URL: str = os.getenv("BACKEND_URL")
    APP_NAME: str = os.getenv("APP_NAME")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # MongoDB
    MONGO_URI: str = os.getenv("MONGO_URI")
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

    # MongoDB

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY")
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

    # Email
    SMTP_HOST: str = os.getenv("SMTP_HOST")
    SMTP_PORT: int = os.getenv("SMTP_PORT")
    SMTP_USER: str = os.getenv("SMTP_USER")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM")

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]

    # Vector Database
    VECTOR_DB_URL: Optional[str] = None
    VECTOR_DB_COLLECTION: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
