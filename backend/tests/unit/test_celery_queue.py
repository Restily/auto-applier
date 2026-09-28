"""Unit tests for `CeleryJobQueue` (ADR-0012): a stub Celery app, no network calls.

The stub mimics only the slice of `celery.Celery.send_task` that
`CeleryJobQueue` calls (`send_task(name, args=, kwargs=, **options)`,
returning an object with `.id`), so these tests run without a broker.
"""

from dataclasses import dataclass
from typing import Any

from autoapplier.adapters.queue.celery_factory import QUEUE_DEFAULT
from autoapplier.adapters.queue.celery_queue import CeleryJobQueue


@dataclass(frozen=True)
class _StubResult:
    id: str


@dataclass(frozen=True)
class _StubCall:
    name: str
    args: Any
    kwargs: Any
    options: dict[str, Any]


class StubCeleryApp:
    """Records every `send_task` call and returns an incrementing fake task id."""

    def __init__(self) -> None:
        self.calls: list[_StubCall] = []

    def send_task(
        self, name: str, args: Any = None, kwargs: Any = None, **options: Any
    ) -> _StubResult:
        self.calls.append(_StubCall(name=name, args=args, kwargs=kwargs, options=options))
        return _StubResult(id=f"task-{len(self.calls)}")


async def test_enqueue_sends_by_name_to_default_queue() -> None:
    app = StubCeleryApp()
    queue = CeleryJobQueue(app)

    task_id = await queue.enqueue("system.ping")

    assert task_id == "task-1"
    assert len(app.calls) == 1
    call = app.calls[0]
    assert call.name == "system.ping"
    assert call.args == []
    assert call.kwargs == {}
    assert call.options["queue"] == QUEUE_DEFAULT


async def test_enqueue_passes_args_kwargs_and_explicit_queue() -> None:
    app = StubCeleryApp()
    queue = CeleryJobQueue(app)

    task_id = await queue.enqueue(
        "ingest.aggregator", args=[1, "two"], kwargs={"source_id": "abc"}, queue="ingest"
    )

    assert task_id == "task-1"
    call = app.calls[0]
    assert call.name == "ingest.aggregator"
    assert call.args == [1, "two"]
    assert call.kwargs == {"source_id": "abc"}
    assert call.options["queue"] == "ingest"


async def test_enqueue_never_schedules_eta_or_countdown() -> None:
    app = StubCeleryApp()
    queue = CeleryJobQueue(app)

    await queue.enqueue("system.ping")

    call = app.calls[0]
    assert "eta" not in call.options
    assert "countdown" not in call.options
    assert "expires" not in call.options
