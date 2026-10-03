"""Contract tests every `LLMProvider` must satisfy (ADR-0006).

The anthropic case runs against a mocked Messages API transport; the fake case
is scripted through `FakeReply`/`fail_next`. Nothing here touches the network.
"""

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import anthropic
import httpx2
import pytest
from pydantic import SecretStr

from autoapplier.adapters.llm.anthropic import AnthropicProvider
from autoapplier.adapters.llm.fake import FakeLLMProvider, FakeReply
from autoapplier.ports.llm import (
    LLMConfigError,
    LLMError,
    LLMMessage,
    LLMProvider,
    LLMRequest,
    LLMUnavailableError,
)

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "llm" / "anthropic"
SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {"full_name": {"type": ["string", "null"]}},
    "required": ["full_name"],
    "additionalProperties": False,
}


def body(name: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return data


class Harness:
    """Scripts one provider kind for each contract scenario.

    The anthropic SDK runs on `httpx2`, which `respx` cannot patch, so the
    anthropic case injects an `httpx2.MockTransport` client instead. Either way
    no request leaves the process.
    """

    def __init__(self, kind: str) -> None:
        self.kind = kind
        self.requests: list[httpx2.Request] = []
        self._handler: Callable[[httpx2.Request], httpx2.Response] = self._unscripted
        self.fake = FakeLLMProvider(
            {"contract.task": FakeReply(text="{}", data={"full_name": "Alex Ivanov"})}
        )
        self.provider: LLMProvider = self.fake if kind == "fake" else self._anthropic()

    def _anthropic(self) -> AnthropicProvider:
        def handle(request: httpx2.Request) -> httpx2.Response:
            self.requests.append(request)
            return self._handler(request)

        client = anthropic.AsyncAnthropic(
            api_key="sk-test",
            max_retries=0,
            http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handle)),
        )
        return AnthropicProvider(
            api_key=SecretStr("sk-test"),
            models={"fast": "claude-test-fast", "smart": "claude-test-smart"},
            client=client,
        )

    @staticmethod
    def _unscripted(request: httpx2.Request) -> httpx2.Response:
        raise AssertionError(f"unscripted request to {request.url}")

    def _respond(self, status: int, payload: dict[str, Any]) -> None:
        self._handler = lambda request: httpx2.Response(status, json=payload)

    def script_ok(self) -> None:
        if self.kind == "anthropic":
            self._respond(200, body("message_json.json"))

    def script_error(self, error: LLMError, status: int) -> None:
        if self.kind == "fake":
            self.fake.fail_next(error)
        else:
            self._respond(status, {"type": "error", "error": {"type": "x", "message": "boom"}})

    def script_timeout(self) -> None:
        if self.kind == "fake":
            self.fake.fail_next(LLMUnavailableError("timeout"))
        else:

            def slow(request: httpx2.Request) -> httpx2.Response:
                raise httpx2.ReadTimeout("slow", request=request)

            self._handler = slow

    def script_refusal(self) -> None:
        if self.kind == "fake":
            self.fake.fail_next(LLMError("refusal"))
        else:
            self._respond(200, body("refusal.json"))

    def script_invalid_json_twice(self) -> None:
        if self.kind == "fake":
            self.fake.fail_next(LLMError("invalid json"))
        else:
            self._respond(200, body("invalid_json.json"))


@pytest.fixture(params=["fake", "anthropic"])
def harness(request: pytest.FixtureRequest) -> Harness:
    return Harness(request.param)


def make_request(task: str = "contract.task") -> LLMRequest:
    return LLMRequest(
        task=task,
        system="Extract the profile.",
        messages=(LLMMessage(role="user", content="Alex Ivanov, engineer"),),
        json_schema=SCHEMA,
    )


async def test_structured_request_returns_data(harness: Harness) -> None:
    harness.script_ok()

    response = await harness.provider.complete(make_request())

    assert response.data == {"full_name": "Alex Ivanov"}
    assert response.provider == harness.provider.name
    assert response.usage.input_tokens >= 0


async def test_rate_limit_is_unavailable(harness: Harness) -> None:
    harness.script_error(LLMUnavailableError("rate limited"), 429)

    with pytest.raises(LLMUnavailableError):
        await harness.provider.complete(make_request())


async def test_timeout_is_unavailable(harness: Harness) -> None:
    harness.script_timeout()

    with pytest.raises(LLMUnavailableError):
        await harness.provider.complete(make_request())


async def test_auth_error_is_config_error(harness: Harness) -> None:
    harness.script_error(LLMConfigError("bad key"), 401)

    with pytest.raises(LLMConfigError):
        await harness.provider.complete(make_request())


async def test_refusal_is_llm_error(harness: Harness) -> None:
    harness.script_refusal()

    with pytest.raises(LLMError):
        await harness.provider.complete(make_request())


async def test_invalid_json_twice_is_llm_error(harness: Harness) -> None:
    harness.script_invalid_json_twice()

    with pytest.raises(LLMError) as info:
        await harness.provider.complete(make_request())

    assert not isinstance(info.value, (LLMUnavailableError, LLMConfigError))


async def test_anthropic_request_shape_has_no_sampling_params() -> None:
    harness = Harness("anthropic")
    harness.script_ok()

    await harness.provider.complete(make_request())

    sent: dict[str, Any] = json.loads(harness.requests[-1].content)
    assert sent["model"] == "claude-test-fast"
    assert "temperature" not in sent
    assert "top_p" not in sent
    assert sent["output_config"]["format"] == {"type": "json_schema", "schema": SCHEMA}
    assert len(harness.requests) == 1


async def test_anthropic_invalid_json_is_retried_once() -> None:
    harness = Harness("anthropic")
    harness.script_invalid_json_twice()

    with pytest.raises(LLMError):
        await harness.provider.complete(make_request())

    assert len(harness.requests) == 2
