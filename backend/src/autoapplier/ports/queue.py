"""Job queue port: how services enqueue background work (ADR-0012).

`enqueue` has no delay parameter by design: pacing, "send tomorrow" after a
daily limit and rate-limit retries are `scheduled_at` in Postgres, dispatched
by Celery Beat — never a Celery `eta`/`countdown` (an unacked ETA message is
redelivered after the broker's visibility timeout, so a long-delayed one can
run twice). Producers depend on this Protocol, never on `celery` directly;
`autoapplier.wiring` injects the configured implementation.
"""

from collections.abc import Mapping, Sequence
from typing import Protocol, TypeAlias

JsonValue: TypeAlias = str | int | float | bool | list["JsonValue"] | dict[str, "JsonValue"] | None


class JobQueue(Protocol):
    """Enqueues a named task by id; the concrete adapter resolves it to code."""

    async def enqueue(
        self,
        task_name: str,
        *,
        args: Sequence[JsonValue] = (),
        kwargs: Mapping[str, JsonValue] | None = None,
        queue: str | None = None,
    ) -> str: ...
