"""Celery app factory (ADR-0012): JSON-only, Redis broker + result backend.

`create_celery_app` only sets configuration; it registers no tasks. Task 4B
adds the worker module (`autoapplier.worker.celery_app`), the Beat schedule
and the `system.*` tasks.
"""

from typing import Final

from celery import Celery

from autoapplier.config import Settings

QUEUE_DEFAULT: Final = "default"


def create_celery_app(settings: Settings, *, main: str = "autoapplier") -> Celery:
    """Build a `Celery` app configured per ADR-0012. Registers no tasks."""
    app = Celery(main)
    app.conf.update(
        broker_url=settings.redis_url,
        result_backend=settings.redis_url,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,
        broker_transport_options={"visibility_timeout": 3600},
        result_expires=86400,
        task_default_queue=QUEUE_DEFAULT,
        broker_connection_retry_on_startup=True,
        timezone="UTC",
    )
    return app
