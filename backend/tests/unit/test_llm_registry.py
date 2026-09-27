"""Unit tests for the LLM provider registry (ADR-0006)."""

import pytest

from autoapplier.adapters.llm.fake import FakeLLMProvider
from autoapplier.adapters.llm.registry import build_llm_provider
from autoapplier.config import Settings, get_settings
from autoapplier.ports.llm import LLMConfigError


def test_fake_selected_in_tests() -> None:
    provider = build_llm_provider(get_settings())

    assert isinstance(provider, FakeLLMProvider)


def test_unregistered_provider_raises_config_error() -> None:
    settings = Settings(_env_file=None, app_env="local", llm_provider="anthropic")

    with pytest.raises(LLMConfigError, match="LLM_PROVIDER=fake"):
        build_llm_provider(settings)
