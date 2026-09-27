"""Registry mapping `Settings.llm_provider` to an `LLMProvider` implementation.

M0 registers only the deterministic fake (ADR-0006); M1 adds `anthropic`,
`openai` and `openrouter` factories here. Services never import a provider
adapter directly — `autoapplier.wiring` calls `build_llm_provider` once at
startup and injects the result.
"""

from collections.abc import Callable

from autoapplier.adapters.llm.fake import FakeLLMProvider
from autoapplier.config import Settings
from autoapplier.ports.llm import LLMConfigError, LLMProvider

ProviderFactory = Callable[[Settings], LLMProvider]

PROVIDERS: dict[str, ProviderFactory] = {
    "fake": lambda settings: FakeLLMProvider(),
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
