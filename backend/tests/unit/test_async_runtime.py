"""Unit tests for `AsyncRuntime` (ADR-0012): the sync/async bridge Celery tasks run through.

A fake factory/close pair counts builds and closes so tests can assert on lifecycle
without any real container (asyncpg pool, async Redis client) or event loop wiring.
"""

import os
from dataclasses import dataclass, field

import pytest

from autoapplier.worker.runtime import AsyncRuntime


@dataclass
class _FakeContainer:
    """A fake `C`: just an id so tests can tell which build produced it."""

    build_id: int


@dataclass
class _FakeContainerFactory:
    """Counts `factory`/`close` calls; each `factory()` call yields a new `_FakeContainer`."""

    builds: int = 0
    closes: int = 0
    closed_ids: list[int] = field(default_factory=list)

    async def factory(self) -> _FakeContainer:
        self.builds += 1
        return _FakeContainer(build_id=self.builds)

    async def close(self, container: _FakeContainer) -> None:
        self.closes += 1
        self.closed_ids.append(container.build_id)


async def _build_id(container: _FakeContainer) -> int:
    return container.build_id


def test_runs_coroutine_and_returns_value() -> None:
    fake = _FakeContainerFactory()
    runtime: AsyncRuntime[_FakeContainer] = AsyncRuntime(fake.factory, fake.close)

    result = runtime.run(_build_id)

    assert result == 1
    assert fake.builds == 1


def test_reuses_loop_and_container_across_calls() -> None:
    fake = _FakeContainerFactory()
    runtime: AsyncRuntime[_FakeContainer] = AsyncRuntime(fake.factory, fake.close)

    first = runtime.run(_build_id)
    second = runtime.run(_build_id)

    assert (first, second) == (1, 1)
    assert fake.builds == 1


def test_rebuilds_after_pid_change_without_closing_inherited(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = _FakeContainerFactory()
    runtime: AsyncRuntime[_FakeContainer] = AsyncRuntime(fake.factory, fake.close)
    real_pid = os.getpid()

    monkeypatch.setattr(os, "getpid", lambda: real_pid)
    first = runtime.run(_build_id)

    monkeypatch.setattr(os, "getpid", lambda: real_pid + 1)
    second = runtime.run(_build_id)

    assert (first, second) == (1, 2)
    assert fake.builds == 2
    assert fake.closes == 0


def test_shutdown_closes_once_and_is_idempotent() -> None:
    fake = _FakeContainerFactory()
    runtime: AsyncRuntime[_FakeContainer] = AsyncRuntime(fake.factory, fake.close)
    runtime.run(_build_id)

    runtime.shutdown()
    runtime.shutdown()

    assert fake.closes == 1
    assert fake.closed_ids == [1]


def test_run_inside_running_loop_raises() -> None:
    fake = _FakeContainerFactory()
    runtime: AsyncRuntime[_FakeContainer] = AsyncRuntime(fake.factory, fake.close)

    async def reentrant(container: _FakeContainer) -> int:
        return runtime.run(_build_id)

    with pytest.raises(RuntimeError):
        runtime.run(reentrant)
