"""Unit tests for the deterministic fake LLM provider (ADR-0006).

No network calls: `FakeLLMProvider` is a pure function of the request, with
optional overrides and fixtures. See ADR-0006 and `ports/llm.py`.
"""

import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import pytest

from autoapplier.adapters.llm.fake import FakeLLMProvider, FakeReply, request_fingerprint
from autoapplier.ports.llm import (
    LLMError,
    LLMMessage,
    LLMProvider,
    LLMRequest,
    LLMUnavailableError,
    ModelTier,
)

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "llm"


def make_request(
    *,
    task: str = "resume.extract",
    system: str = "You are a resume parser.",
    messages: tuple[LLMMessage, ...] = (LLMMessage(role="user", content="Jane Doe"),),
    tier: ModelTier = "fast",
    max_output_tokens: int = 1024,
    temperature: float = 0.0,
    json_schema: Mapping[str, Any] | None = None,
) -> LLMRequest:
    return LLMRequest(
        task=task,
        system=system,
        messages=messages,
        tier=tier,
        max_output_tokens=max_output_tokens,
        temperature=temperature,
        json_schema=json_schema,
    )


async def test_same_request_same_response() -> None:
    provider = FakeLLMProvider()
    request = make_request()

    first = await provider.complete(request)
    second = await provider.complete(request)

    assert first == second


async def test_different_messages_different_text() -> None:
    provider = FakeLLMProvider()
    request_a = make_request(messages=(LLMMessage(role="user", content="Alice"),))
    request_b = make_request(messages=(LLMMessage(role="user", content="Bob"),))

    response_a = await provider.complete(request_a)
    response_b = await provider.complete(request_b)

    assert response_a.text != response_b.text


async def test_task_reply_used() -> None:
    provider = FakeLLMProvider(replies={"resume.extract": FakeReply(text="hello from task reply")})
    request = make_request(task="resume.extract")

    response = await provider.complete(request)

    assert response.text == "hello from task reply"


async def test_fingerprint_reply_beats_task_reply() -> None:
    request = make_request(task="resume.extract")
    fingerprint = request_fingerprint(request)
    provider = FakeLLMProvider(
        replies={
            "resume.extract": FakeReply(text="task reply"),
            fingerprint: FakeReply(text="fingerprint reply"),
        }
    )

    response = await provider.complete(request)

    assert response.text == "fingerprint reply"


async def test_fixture_file_used() -> None:
    provider = FakeLLMProvider(fixtures_dir=FIXTURES_DIR)
    request = make_request(task="example.task")

    response = await provider.complete(request)

    assert response.text == "This is the fixture reply for example.task."
    assert response.data == {"example": True}


async def test_json_schema_without_data_raises_llm_error() -> None:
    provider = FakeLLMProvider()
    request = make_request(task="resume.extract", json_schema={"type": "object"})

    with pytest.raises(LLMError, match=re.escape("no fake data for task resume.extract")):
        await provider.complete(request)


async def test_fail_next_raises_once_then_recovers() -> None:
    provider = FakeLLMProvider()
    request = make_request()
    error = LLMUnavailableError("simulated outage")
    provider.fail_next(error)

    with pytest.raises(LLMUnavailableError):
        await provider.complete(request)

    response = await provider.complete(request)

    assert response.text.startswith("[fake:resume.extract]")


async def test_calls_are_recorded() -> None:
    provider = FakeLLMProvider()
    request_a = make_request(task="resume.extract")
    request_b = make_request(task="vacancy.structure")

    await provider.complete(request_a)
    await provider.complete(request_b)

    assert provider.calls == [request_a, request_b]


def test_fake_satisfies_protocol() -> None:
    provider: LLMProvider = FakeLLMProvider()

    assert provider.name == "fake"
