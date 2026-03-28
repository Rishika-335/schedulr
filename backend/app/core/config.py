from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Schedulr"
    DEBUG: bool = False
    SECRET_KEY: str = "super-secret-key-change-in-production"

    # Database
    DATABASE_URL: str = "mysql+pymysql://user:password@localhost:3306/schedulr"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "https://schedulr-c.netlify.app",
        "*",
    ]

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@schedulr.app"
    EMAIL_ENABLED: bool = False

    # App URL
    APP_URL: str = "http://localhost:5173"

    # Default user (no login required)
    DEFAULT_USER_ID: int = 1

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
