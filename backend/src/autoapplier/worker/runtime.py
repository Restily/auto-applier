"""The async bridge Celery tasks run through (ADR-0012, option II).

Celery tasks are thin sync functions; `AsyncRuntime` gives each worker process one
event loop and one lazily built container `C` (asyncpg pool, async Redis, ...),
reused by every task that process handles — never a short-lived pool per call.
Generic and `wiring`-free by design: Task 6 supplies the actual `Container`
factory/close pair for the real worker process; tests here use a fake `C`.
"""

import asyncio
import os
from collections.abc import Awaitable, Callable
from typing import Generic, TypeVar

C = TypeVar("C")
T = TypeVar("T")


class AsyncRuntime(Generic[C]):
    """One event loop + one `C` per process, created lazily on the first `run`.

    A prefork child inherits the parent's loop and container by copying memory,
    not by running this class's code — so when `os.getpid()` no longer matches the
    pid that built them, they're simply discarded (never closed: they belong to,
    and are still in use by, the parent) and rebuilt fresh in the child.
    """

    def __init__(
        self,
        factory: Callable[[], Awaitable[C]],
        close: Callable[[C], Awaitable[None]],
    ) -> None:
        self._factory = factory
        self._close = close
        self._loop: asyncio.AbstractEventLoop | None = None
        self._container: C | None = None
        self._pid: int | None = None

    def run(self, fn: Callable[[C], Awaitable[T]]) -> T:
        """Run `fn(container)` to completion on this process's loop and return its result.

        Raises `RuntimeError` if called while this runtime's own loop is already
        running (e.g. `fn` itself calls back into `run` synchronously) — there is
        no re-entrancy.
        """
        loop = self._loop_for_this_process()
        if loop.is_running():
            raise RuntimeError(
                "AsyncRuntime.run() called re-entrantly: this runtime's event loop "
                "is already running"
            )

        async def _runner() -> T:
            container = await self._ensure_container()
            return await fn(container)

        return loop.run_until_complete(_runner())

    def shutdown(self) -> None:
        """Close the container (via `close`) and the loop. Idempotent."""
        if self._loop is None:
            return
        loop, container = self._loop, self._container
        self._loop, self._container, self._pid = None, None, None
        if container is not None:
            loop.run_until_complete(self._close(container))
        loop.close()

    def _loop_for_this_process(self) -> asyncio.AbstractEventLoop:
        pid = os.getpid()
        if self._loop is None or pid != self._pid:
            self._loop = asyncio.new_event_loop()
            self._container = None
            self._pid = pid
        return self._loop

    async def _ensure_container(self) -> C:
        if self._container is None:
            self._container = await self._factory()
        return self._container
