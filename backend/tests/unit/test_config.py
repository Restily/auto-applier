"""Unit tests for autoapplier.config.Settings and get_settings."""

import pytest
from pydantic import ValidationError

from autoapplier.config import BACKEND_DIR, Settings, get_settings


def test_defaults_point_to_local_supabase() -> None:
    settings = Settings(_env_file=None)

    assert settings.database_url == "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    assert settings.llm_provider == "fake"


def test_env_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_KEY_PREFIX", "aa:x:")

    settings = Settings(_env_file=None)

    assert settings.redis_key_prefix == "aa:x:"


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


def test_unused_network_settings_removed() -> None:
    for name in ("api_host", "api_port", "web_origin"):
        assert name not in Settings.model_fields
    example = (BACKEND_DIR / ".env.example").read_text()
    for line in ("API_HOST=", "API_PORT=", "WEB_ORIGIN="):
        assert line not in example


def test_supabase_jwt_secret_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "s3cret-value-xyz")

    settings = Settings(_env_file=None)

    assert settings.supabase_jwt_secret is not None
    assert settings.supabase_jwt_secret.get_secret_value() == "s3cret-value-xyz"
    assert "s3cret-value-xyz" not in repr(settings)
    assert "SUPABASE_JWT_SECRET=" in (BACKEND_DIR / ".env.example").read_text()


def test_jwks_cache_ttl_default_and_positive() -> None:
    assert Settings(_env_file=None).auth_jwks_cache_ttl_s == 600
    with pytest.raises(ValidationError):
        Settings(_env_file=None, auth_jwks_cache_ttl_s=0)


def test_ci_env_requires_fake_llm() -> None:
    with pytest.raises(ValidationError, match="LLM_PROVIDER=fake"):
        Settings(_env_file=None, app_env="ci", llm_provider="anthropic")
    assert Settings(_env_file=None, app_env="ci", llm_provider="fake").app_env == "ci"


def test_env_example_suggests_model_ids() -> None:
    example = (BACKEND_DIR / ".env.example").read_text()
    assert "claude-opus-5" in example
    assert "claude-haiku-4-5" in example

