"""Anthropic implementation of the `LLMProvider` port (ADR-0006).

Structured output goes through `output_config.format` (JSON schema). Sampling
params (`temperature`, `top_p`) are never sent: current Claude models reject
them. SDK retries are off; the calling service owns retry policy.
"""

import json
from collections.abc import Mapping
from typing import Any

import anthropic
from pydantic import SecretStr

from autoapplier.ports.llm import (
    LLMConfigError,
    LLMError,
    LLMRequest,
    LLMResponse,
    LLMUnavailableError,
    LLMUsage,
    ModelTier,
)

_INVALID_JSON_ATTEMPTS = 2


class AnthropicProvider:
    """`LLMProvider` backed by the Anthropic Messages API."""

    name = "anthropic"

    def __init__(
        self,
        *,
        api_key: SecretStr,
        models: Mapping[ModelTier, str],
        timeout_s: float = 45.0,
        client: anthropic.AsyncAnthropic | None = None,
    ) -> None:
        self._models = dict(models)
        self._client = client or anthropic.AsyncAnthropic(
            api_key=api_key.get_secret_value(), timeout=timeout_s, max_retries=0
        )

    async def complete(self, request: LLMRequest) -> LLMResponse:
        model = self._models.get(request.tier)
        if model is None:
            raise LLMConfigError(f"no model configured for tier {request.tier!r}")

        last_error: LLMError | None = None
        for _ in range(_INVALID_JSON_ATTEMPTS if request.json_schema is not None else 1):
            message = await self._call(request, model)
            self._check_stop_reason(message.stop_reason)
            text = "".join(block.text for block in message.content if block.type == "text")
            usage = LLMUsage(
                input_tokens=message.usage.input_tokens, output_tokens=message.usage.output_tokens
            )
            if request.json_schema is None:
                return LLMResponse(
                    text=text, data=None, provider=self.name, model=model, usage=usage
                )
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, dict):
                return LLMResponse(
                    text=text, data=parsed, provider=self.name, model=model, usage=usage
                )
            last_error = LLMError("model returned invalid JSON for a structured request")
        raise last_error or LLMError("no response")

    @staticmethod
    def _check_stop_reason(stop_reason: str | None) -> None:
        if stop_reason == "refusal":
            raise LLMError("model refused the request")
        if stop_reason == "max_tokens":
            raise LLMError("model output was truncated (max_tokens)")

    async def _call(self, request: LLMRequest, model: str) -> anthropic.types.Message:
        kwargs: dict[str, Any] = {}
        if request.json_schema is not None:
            kwargs["output_config"] = {
                "format": {"type": "json_schema", "schema": dict(request.json_schema)}
            }
        try:
            message: anthropic.types.Message = await self._client.messages.create(
                model=model,
                max_tokens=request.max_output_tokens,
                system=request.system,
                messages=[{"role": m.role, "content": m.content} for m in request.messages],
                **kwargs,
            )
            return message
        except (
            anthropic.RateLimitError,
            anthropic.InternalServerError,
            anthropic.APIConnectionError,  # includes APITimeoutError
        ) as exc:
            raise LLMUnavailableError(f"anthropic unavailable: {type(exc).__name__}") from exc
        except (
            anthropic.AuthenticationError,
            anthropic.PermissionDeniedError,
            anthropic.NotFoundError,
        ) as exc:
            raise LLMConfigError(
                f"anthropic rejected the configuration: {type(exc).__name__}"
            ) from exc
        except anthropic.APIError as exc:
            raise LLMError(f"anthropic request failed: {type(exc).__name__}") from exc
