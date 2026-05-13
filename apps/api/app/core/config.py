from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Voice AI Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DATABASE_SYNC_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Security
    SECRET_KEY: str
    ENCRYPTION_KEY: str  # Fernet key for API key encryption
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AI Provider Keys (platform fallback)
    OPENAI_DEFAULT_API_KEY: Optional[str] = None
    AZURE_OPENAI_DEFAULT_API_KEY: Optional[str] = None
    AZURE_OPENAI_DEFAULT_ENDPOINT: Optional[str] = None  # e.g. https://myresource.openai.azure.com
    GOOGLE_DEFAULT_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    # Embedding
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Memory & Context
    MAX_CONTEXT_TOKENS: int = 8000
    MEMORY_SIMILARITY_THRESHOLD: float = 0.75
    MEMORY_TOP_K: int = 20
    RECENT_CONVERSATIONS_LIMIT: int = 5

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Sentry
    SENTRY_DSN: Optional[str] = None

    # Audio
    AUDIO_SAMPLE_RATE: int = 24000
    AUDIO_CHANNELS: int = 1
    AUDIO_FORMAT: str = "pcm16"

    # S3
    S3_BUCKET: Optional[str] = None
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    @field_validator("DATABASE_SYNC_URL", mode="before")
    @classmethod
    def build_sync_url(cls, v: str, info) -> str:
        if v:
            return v
        db_url = info.data.get("DATABASE_URL", "")
        return db_url.replace("postgresql+asyncpg://", "postgresql://")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
