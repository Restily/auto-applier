"""In-memory `JobQueue` for tests and local dev without a broker (ADR-0012)."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from autoapplier.adapters.queue.celery_factory import QUEUE_DEFAULT
from autoapplier.ports.queue import JsonValue


@dataclass(frozen=True)
class EnqueuedJob:
    """One call recorded by `InMemoryJobQueue.enqueue`."""

    task_name: str
    args: tuple[JsonValue, ...]
    kwargs: dict[str, JsonValue]
    queue: str


class InMemoryJobQueue:
    """Records every `enqueue` call instead of sending it anywhere.

    Ids are assigned in call order: `"fake-1"`, `"fake-2"`, ...
    """

    def __init__(self) -> None:
        self.enqueued: list[EnqueuedJob] = []

    async def enqueue(
        self,
        task_name: str,
        *,
        args: Sequence[JsonValue] = (),
        kwargs: Mapping[str, JsonValue] | None = None,
        queue: str | None = None,
    ) -> str:
        self.enqueued.append(
            EnqueuedJob(
                task_name=task_name,
                args=tuple(args),
                kwargs=dict(kwargs or {}),
                queue=queue or QUEUE_DEFAULT,
            )
        )
        return f"fake-{len(self.enqueued)}"
