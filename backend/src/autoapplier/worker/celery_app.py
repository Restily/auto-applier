"""The Celery app (ADR-0012): the `-A` target for `celery worker` and `celery beat`.

    celery -A autoapplier.worker.celery_app worker ...
    celery -A autoapplier.worker.celery_app beat ...

Importing this module builds the configured app, registers the `system.*` tasks, sets
the Beat schedule, connects the `worker_ready` heartbeat signal and binds `runtime` (the
per-process `AsyncRuntime[Container]`, Task 6, ADR-0012 option II) that thin sync tasks
call through — everything both processes need from one entry point.
"""

from celery import Celery
from celery.signals import worker_process_shutdown, worker_ready, worker_shutdown

from autoapplier.adapters.queue.celery_factory import create_celery_app
from autoapplier.config import get_settings
from autoapplier.wiring import Container, build_container, close_container
from autoapplier.worker.runtime import AsyncRuntime
from autoapplier.worker.schedule import build_beat_schedule
from autoapplier.worker.signals import write_ready_heartbeat
from autoapplier.worker.tasks import system  # noqa: F401  (registers system.* tasks on import)

app: Celery = create_celery_app(get_settings(), set_as_current=True)
app.conf.beat_schedule = build_beat_schedule(get_settings())

worker_ready.connect(write_ready_heartbeat)

runtime: AsyncRuntime[Container] = AsyncRuntime(
    lambda: build_container(get_settings()), close_container
)


def _shutdown_runtime(**_: object) -> None:
    """Close this process's `Container` and event loop; connected to both shutdown signals."""
    runtime.shutdown()


worker_process_shutdown.connect(_shutdown_runtime)
worker_shutdown.connect(_shutdown_runtime)
