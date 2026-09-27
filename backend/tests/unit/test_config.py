"""Unit tests for autoapplier.config.Settings and get_settings."""

import pytest
from pydantic import ValidationError

from autoapplier.config import Settings, get_settings


def test_defaults_point_to_local_supabase() -> None:
    settings = Settings(_env_file=None)

    assert settings.database_url == "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    assert settings.api_host == "127.0.0.1"
    assert settings.llm_provider == "fake"


def test_env_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("API_PORT", "9001")

    settings = Settings(_env_file=None)

    assert settings.api_port == 9001


def test_test_env_requires_fake_llm() -> None:
    with pytest.raises(ValidationError, match="LLM_PROVIDER=fake"):
        Settings(_env_file=None, app_env="test", llm_provider="anthropic")


def test_local_env_allows_real_provider_name() -> None:
    settings = Settings(_env_file=None, app_env="local", llm_provider="anthropic")

    assert settings.llm_provider == "anthropic"


def test_heartbeat_max_age_must_exceed_interval() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, worker_heartbeat_interval_s=10, queue_heartbeat_max_age_s=5)


def test_redis_key_prefix_must_end_with_colon() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, redis_key_prefix="aa")


def test_get_settings_is_cached() -> None:
    assert get_settings() is get_settings()
