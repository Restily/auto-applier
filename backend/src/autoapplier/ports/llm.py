"""LLM provider port: the interface `autoapplier.services` depends on.

Provider-agnostic request/response contracts (ADR-0006). Services ask for a
model tier ("fast" or "smart"), never a concrete model id or vendor; a
registry in `autoapplier.adapters.llm.registry` resolves the configured
implementation from `autoapplier.config.Settings`.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Literal, Protocol

Role = Literal["user", "assistant"]
ModelTier = Literal["fast", "smart"]


@dataclass(frozen=True, slots=True)
class LLMMessage:
    """One turn in the conversation sent to the model."""

    role: Role
    content: str


@dataclass(frozen=True, slots=True)
class LLMRequest:
    """Everything a provider needs to answer, independent of vendor.

    `task` is a stable id for the calling use case (e.g. `"resume.extract"`);
    it selects fixtures and scripted replies for the fake provider and is
    never sent to a real model.
    """

    task: str
    system: str
    messages: tuple[LLMMessage, ...]
    tier: ModelTier = "fast"
    max_output_tokens: int = 1024
    temperature: float = 0.0
    json_schema: Mapping[str, Any] | None = None


@dataclass(frozen=True, slots=True)
class LLMUsage:
    """Token accounting for one `complete()` call."""

    input_tokens: int
    output_tokens: int


@dataclass(frozen=True, slots=True)
class LLMResponse:
    """A provider's answer to one `LLMRequest`."""

    text: str
    data: Mapping[str, Any] | None
    provider: str
    model: str
    usage: LLMUsage


class LLMError(Exception):
    """Base class for LLM provider failures."""


class LLMUnavailableError(LLMError):
    """The provider is unreachable or failing transiently; safe to retry."""


class LLMConfigError(LLMError):
    """The provider is misconfigured: unknown name, missing key, bad schema."""


class LLMProvider(Protocol):
    """A vendor-specific implementation adapters provide and services consume."""

    name: str

    async def complete(self, request: LLMRequest) -> LLMResponse: ...
