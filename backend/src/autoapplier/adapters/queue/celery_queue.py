"""`JobQueue` adapter over a configured Celery app (ADR-0012).

`Celery.send_task` does blocking network I/O to the broker, so it runs in a
worker thread (`asyncio.to_thread`) and never blocks the event loop.
"""

import asyncio
from collections.abc import Mapping, Sequence
from typing import cast

from celery import Celery

from autoapplier.adapters.queue.celery_factory import QUEUE_DEFAULT
from autoapplier.ports.queue import JsonValue


class CeleryJobQueue:
    """`JobQueue` that hands work to Celery via `Celery.send_task` — never imports task code."""

    def __init__(self, app: Celery) -> None:
        self._app = app

    async def enqueue(
        self,
        task_name: str,
        *,
        args: Sequence[JsonValue] = (),
        kwargs: Mapping[str, JsonValue] | None = None,
        queue: str | None = None,
    ) -> str:
        """Send `task_name` to the broker. Never passes `eta`, `countdown` or `expires`."""
        result = await asyncio.to_thread(
            self._app.send_task,
            task_name,
            args=list(args),
            kwargs=dict(kwargs or {}),
            queue=queue or QUEUE_DEFAULT,
        )
        return cast(str, result.id)
