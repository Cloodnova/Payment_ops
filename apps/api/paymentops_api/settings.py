"""Runtime configuration for PaymentOps.

All configuration is sourced from environment variables (and an optional ``.env``
file in local development). Nothing sensitive is ever hard-coded. Settings here are
deliberately structured so that /api/v1/info can expose a *safe*, non-secret subset.
"""

from __future__ import annotations

from enum import StrEnum
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class AppEnvironment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    DEMO = "demo"
    PRODUCTION = "production"


class AIProvider(StrEnum):
    NONE = "none"
    OLLAMA = "ollama"
    VLLM = "vllm"
    CUSTOM = "custom"


class Settings(BaseSettings):
    """Base settings for the platform. See `.env.example` for documentation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- General ---
    app_version: str = Field(default="0.1.0", validate_default=True)
    app_environment: AppEnvironment = AppEnvironment.DEVELOPMENT
    app_log_level: str = "INFO"
    app_debug: bool = False
    app_timezone: str = "UTC"

    # --- API ---
    api_title: str = "CloudNova PaymentOps"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 1

    # --- Security ---
    # Comma or list. Kept internal; production should be a restrictive allow-list.
    # NoDecode prevents pydantic-settings from JSON-decoding these list env vars; the
    # comma-splitting validator below then handles human-friendly env values.
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    allowed_hosts: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["localhost"])

    # --- AI (non-authoritative) ---
    ai_enabled: bool = False
    ai_provider: AIProvider = AIProvider.NONE
    ai_base_url: str | None = None
    ai_model: str | None = None

    # --- Database ---
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "paymentops"
    database_user: str = "paymentops"
    database_password: str = "replace-me"
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # --- Redis / queue ---
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # --- Observability ---
    metrics_enabled: bool = True

    # --- Readiness ---
    # Dependencies to probe at /ready. An empty list means "no external deps required".
    ready_checks: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["database", "redis"]
    )

    # --- Processing (zero-retention) ---
    zero_retention_enabled: bool = True
    raw_payload_ttl_seconds: int = 0

    # --- Address provider ---
    # auto | cloudnova | swift. "auto" uses the Swift-derived provider when configured
    # (swift_address_url set), otherwise the CloudNova deterministic provider.
    address_provider: str = "auto"
    swift_address_url: str = ""
    swift_address_timeout: float = 2.0
    swift_address_max_retries: int = 1

    @field_validator("cors_allowed_origins", "allowed_hosts", "ready_checks", mode="before")
    @classmethod
    def _split_comma(cls, value: object) -> object:
        """Accept either a single string (comma separated) or a list."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def environment(self) -> str:
        return self.app_environment.value

    @property
    def is_production(self) -> bool:
        return self.app_environment == AppEnvironment.PRODUCTION

    def sqlalchemy_dsn(self) -> str:
        return (
            f"postgresql+psycopg2://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    def async_sqlalchemy_dsn(self) -> str:
        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )

    def safe_info(self) -> dict[str, object]:
        """A minimal, non-secret view for /api/v1/info. Never include credentials."""
        return {
            "product": self.api_title,
            "version": self.app_version,
            "environment": self.environment,
            "ai_enabled": self.ai_enabled,
            "ai_provider": self.ai_provider.value if self.ai_enabled else "none",
            "zero_retention_enabled": self.zero_retention_enabled,
            "database_configured": bool(self.database_host),
            "redis_configured": bool(self.redis_host),
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
