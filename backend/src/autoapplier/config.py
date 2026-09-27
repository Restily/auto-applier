"""Application settings: the single validated source of truth for process configuration.

Values come from process environment variables (case-insensitive) and, when present,
`backend/.env` (see `BACKEND_DIR`); explicit keyword arguments passed to `Settings()`
always win over both. Use `get_settings()` to get the cached, process-wide instance.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal["local", "test", "ci"]
LLMProviderName = Literal["fake", "anthropic", "openai", "openrouter"]

# backend/ resolved from this file: backend/src/autoapplier/config.py -> backend/
BACKEND_DIR: Path = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Process configuration, loaded from the environment and `backend/.env`."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: AppEnv = "local"

    database_url: str = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    supabase_url: str = "http://127.0.0.1:54321"
    supabase_secret_key: SecretStr | None = None

    api_host: str = "127.0.0.1"
    api_port: int = 8000
    web_origin: str = "http://localhost:3000"

    llm_provider: LLMProviderName = "fake"
    llm_model_fast: str | None = None
    llm_model_smart: str | None = None
    anthropic_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None

    # Celery broker + result backend, app keys (ADR-0012).
    redis_url: str = "redis://127.0.0.1:6379/0"
    redis_key_prefix: str = "aa:"

    worker_heartbeat_interval_s: float = Field(default=10.0, gt=0)
    queue_heartbeat_max_age_s: float = 30.0
    health_probe_timeout_s: float = Field(default=2.0, gt=0)

    @model_validator(mode="after")
    def _test_env_requires_fake_llm(self) -> Self:
        if self.app_env == "test" and self.llm_provider != "fake":
            raise ValueError(
                "tests must never call a live LLM: set LLM_PROVIDER=fake when APP_ENV=test"
            )
        return self

    @model_validator(mode="after")
    def _heartbeat_max_age_exceeds_interval(self) -> Self:
        if self.queue_heartbeat_max_age_s <= self.worker_heartbeat_interval_s:
            raise ValueError(
                "queue_heartbeat_max_age_s must be greater than worker_heartbeat_interval_s"
            )
        return self

    @model_validator(mode="after")
    def _redis_key_prefix_ends_with_colon(self) -> Self:
        if not self.redis_key_prefix.endswith(":"):
            raise ValueError("redis_key_prefix must end with ':'")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide `Settings` singleton, built once and cached."""
    return Settings()
