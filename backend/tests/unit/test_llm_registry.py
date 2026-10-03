"""Unit tests for the LLM provider registry (ADR-0006)."""

import pytest
from pydantic import SecretStr

from autoapplier.adapters.llm.anthropic import AnthropicProvider
from autoapplier.adapters.llm.fake import FakeLLMProvider
from autoapplier.adapters.llm.registry import build_llm_provider
from autoapplier.config import Settings, get_settings
from autoapplier.ports.llm import LLMConfigError, LLMMessage, LLMRequest


def test_fake_selected_in_tests() -> None:
    provider = build_llm_provider(get_settings())

    assert isinstance(provider, FakeLLMProvider)


def test_unregistered_provider_raises_config_error() -> None:
    settings = Settings(_env_file=None, app_env="local", llm_provider="openai")

    with pytest.raises(LLMConfigError, match="LLM_PROVIDER=fake"):
        build_llm_provider(settings)


def test_anthropic_requires_key_and_models() -> None:
    base = {"_env_file": None, "app_env": "local", "llm_provider": "anthropic"}
    full = {
        "anthropic_api_key": "sk-test",
        "llm_model_smart": "claude-smart",
        "llm_model_fast": "claude-fast",
    }
    names = {
        "anthropic_api_key": "ANTHROPIC_API_KEY",
        "llm_model_smart": "LLM_MODEL_SMART",
        "llm_model_fast": "LLM_MODEL_FAST",
    }
    for missing, env_name in names.items():
        kwargs = {k: v for k, v in full.items() if k != missing}
        with pytest.raises(LLMConfigError, match=env_name):
            build_llm_provider(Settings(**base, **kwargs))  # type: ignore[arg-type]


def test_anthropic_built_with_key_and_models() -> None:
    settings = Settings(
        _env_file=None,
        app_env="local",
        llm_provider="anthropic",
        anthropic_api_key=SecretStr("sk-test"),
        llm_model_smart="claude-smart",
        llm_model_fast="claude-fast",
    )

    provider = build_llm_provider(settings)

    assert isinstance(provider, AnthropicProvider)
    assert provider.name == "anthropic"


async def test_fake_registry_provider_serves_resume_fixture() -> None:
    provider = build_llm_provider(get_settings())
    request = LLMRequest(
        task="resume.extract",
        system="parse",
        messages=(LLMMessage(role="user", content="cv"),),
        json_schema={"type": "object"},
    )

    response = await provider.complete(request)

    assert response.data is not None
    assert response.data["full_name"] == "Alex Ivanov"
