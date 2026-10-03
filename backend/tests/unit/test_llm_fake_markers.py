"""Unit tests for the fake LLM's scripted markers."""

from pathlib import Path

import pytest

from autoapplier.adapters.llm.fake import FakeLLMProvider
from autoapplier.ports.llm import LLMMessage, LLMRequest, LLMUnavailableError

FIXTURES = (
    Path(__file__).resolve().parents[2] / "src" / "autoapplier" / "adapters" / "llm" / "fixtures"
)


def request(content: str) -> LLMRequest:
    return LLMRequest(
        task="resume.extract",
        system="parse",
        messages=(LLMMessage(role="user", content=content),),
        json_schema={"type": "object"},
    )


async def test_fail_marker_raises_unavailable() -> None:
    provider = FakeLLMProvider(fixtures_dir=FIXTURES, enable_markers=True)

    with pytest.raises(LLMUnavailableError, match="fake: scripted failure"):
        await provider.complete(request("cv [[fake-llm:fail]]"))


async def test_variant_marker_selects_variant_fixture() -> None:
    provider = FakeLLMProvider(fixtures_dir=FIXTURES, enable_markers=True)

    base = await provider.complete(request("cv"))
    variant = await provider.complete(request("cv [[fake-llm:variant=v2]]"))

    assert base.data is not None
    assert variant.data is not None
    assert base.data != variant.data


async def test_markers_ignored_when_disabled() -> None:
    provider = FakeLLMProvider(fixtures_dir=FIXTURES)

    response = await provider.complete(request("cv [[fake-llm:fail]] [[fake-llm:variant=v2]]"))
    base = await provider.complete(request("cv"))

    assert response.data == base.data
