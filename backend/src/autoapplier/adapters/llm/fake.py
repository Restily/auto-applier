"""Deterministic fake `LLMProvider` (ADR-0006): a pure function of the request.

No network calls, ever. The response depends only on the request's content —
a SHA-256 fingerprint of its canonical JSON — with optional overrides keyed
by fingerprint or task, per-task fixture files, call recording and scripted
failures. `autoapplier.config.Settings` forces this provider whenever
`APP_ENV=test`, so tests are fast, offline and reproducible.
"""

import hashlib
import json
import math
import re
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from autoapplier.ports.llm import (
    LLMError,
    LLMRequest,
    LLMResponse,
    LLMUnavailableError,
    LLMUsage,
)

FAIL_MARKER = "[[fake-llm:fail]]"
_VARIANT_RE = re.compile(r"\[\[fake-llm:variant=([A-Za-z0-9_-]+)\]\]")


def request_fingerprint(request: LLMRequest) -> str:
    """SHA-256 hex digest of `request`'s canonical JSON (all fields, sorted keys)."""
    payload = {
        "task": request.task,
        "system": request.system,
        "messages": [{"role": m.role, "content": m.content} for m in request.messages],
        "tier": request.tier,
        "max_output_tokens": request.max_output_tokens,
        "temperature": request.temperature,
        "json_schema": request.json_schema,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class FakeReply:
    """A scripted answer for the fake provider to return."""

    text: str
    data: Mapping[str, Any] | None = None


class FakeLLMProvider:
    """In-memory `LLMProvider` with no network calls; see module docstring."""

    name = "fake"

    def __init__(
        self,
        replies: Mapping[str, FakeReply] | None = None,
        *,
        fixtures_dir: Path | None = None,
        enable_markers: bool = False,
    ) -> None:
        self._replies: dict[str, FakeReply] = dict(replies) if replies is not None else {}
        self._fixtures_dir = fixtures_dir
        self._enable_markers = enable_markers
        self._next_error: LLMError | None = None
        self.calls: list[LLMRequest] = []

    def fail_next(self, error: LLMError) -> None:
        """Make the next `complete()` call raise `error`; it then recovers."""
        self._next_error = error

    async def complete(self, request: LLMRequest) -> LLMResponse:
        self.calls.append(request)

        if self._next_error is not None:
            error, self._next_error = self._next_error, None
            raise error

        variant: str | None = None
        if self._enable_markers:
            content = "".join(message.content for message in request.messages)
            if FAIL_MARKER in content:
                raise LLMUnavailableError("fake: scripted failure")
            found = _VARIANT_RE.search(content)
            variant = found.group(1) if found else None

        fingerprint = request_fingerprint(request)
        reply = self._resolve_reply(request.task, fingerprint, variant)

        if request.json_schema is not None and reply.data is None:
            raise LLMError(f"no fake data for task {request.task}")

        input_text = request.system + "".join(message.content for message in request.messages)
        usage = LLMUsage(
            input_tokens=math.ceil(len(input_text) / 4),
            output_tokens=math.ceil(len(reply.text) / 4),
        )
        return LLMResponse(
            text=reply.text,
            data=reply.data,
            provider=self.name,
            model=f"fake-{request.tier}",
            usage=usage,
        )

    def _resolve_reply(self, task: str, fingerprint: str, variant: str | None = None) -> FakeReply:
        if fingerprint in self._replies:
            return self._replies[fingerprint]
        if task in self._replies:
            return self._replies[task]
        fixture = self._load_fixture(task, variant)
        if fixture is not None:
            return fixture
        return FakeReply(text=f"[fake:{task}] {fingerprint[:12]}")

    def _load_fixture(self, task: str, variant: str | None = None) -> FakeReply | None:
        if self._fixtures_dir is None:
            return None
        path = self._fixtures_dir / f"{task}.json"
        if variant is not None:
            variant_path = self._fixtures_dir / f"{task}.{variant}.json"
            if variant_path.is_file():
                path = variant_path
        if not path.is_file():
            return None
        payload: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        return FakeReply(text=payload["text"], data=payload.get("data"))
