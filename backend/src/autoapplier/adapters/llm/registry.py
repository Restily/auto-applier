"""Registry mapping `Settings.llm_provider` to an `LLMProvider` implementation.

The deterministic fake (ADR-0006) and `anthropic` are registered; `openai` and
`openrouter` factories are added here later. Services never import a provider
adapter directly — `autoapplier.wiring` calls `build_llm_provider` once at
startup and injects the result.
"""

from collections.abc import Callable
from pathlib import Path

from autoapplier.adapters.llm.anthropic import AnthropicProvider
from autoapplier.adapters.llm.fake import FakeLLMProvider
from autoapplier.config import Settings
from autoapplier.ports.llm import LLMConfigError, LLMProvider

ProviderFactory = Callable[[Settings], LLMProvider]

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def _build_fake(settings: Settings) -> LLMProvider:
    return FakeLLMProvider(fixtures_dir=FIXTURES_DIR, enable_markers=True)


def _build_anthropic(settings: Settings) -> LLMProvider:
    key = settings.anthropic_api_key
    smart = settings.llm_model_smart
    fast = settings.llm_model_fast
    if key is None or not key.get_secret_value():
        raise LLMConfigError("LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY")
    if not smart:
        raise LLMConfigError("LLM_PROVIDER=anthropic requires LLM_MODEL_SMART")
    if not fast:
        raise LLMConfigError("LLM_PROVIDER=anthropic requires LLM_MODEL_FAST")
    return AnthropicProvider(api_key=key, models={"smart": smart, "fast": fast})


PROVIDERS: dict[str, ProviderFactory] = {
    "fake": _build_fake,
    "anthropic": _build_anthropic,
}


def build_llm_provider(settings: Settings) -> LLMProvider:
    """Build the provider selected by `settings.llm_provider`.

    Raises `LLMConfigError` when the name isn't in `PROVIDERS`, listing the
    registered names and the safe fallback for tests and local dev.
    """
    factory = PROVIDERS.get(settings.llm_provider)
    if factory is None:
        registered = ", ".join(sorted(PROVIDERS))
        raise LLMConfigError(
            f"unregistered LLM provider {settings.llm_provider!r} "
            f"(registered: {registered}); set LLM_PROVIDER=fake for tests and local dev"
        )
    return factory(settings)
