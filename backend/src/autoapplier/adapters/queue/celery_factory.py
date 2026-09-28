"""Celery app factory (ADR-0012): JSON-only, Redis broker + result backend.

`create_celery_app` only sets configuration; it registers no tasks. Task 4B
adds the worker module (`autoapplier.worker.celery_app`), the Beat schedule
and the `system.*` tasks.
"""

from typing import Final

from celery import Celery

from autoapplier.config import Settings

QUEUE_DEFAULT: Final = "default"

# Mirrors `kv/client.py`'s 2 s socket timeouts, so a down/slow broker or result
# backend fails fast instead of hanging the caller.
_SOCKET_CONNECT_TIMEOUT_S = 2
_SOCKET_TIMEOUT_S = 2


def create_celery_app(
    settings: Settings, *, main: str = "autoapplier", set_as_current: bool = False
) -> Celery:
    """Build a `Celery` app configured per ADR-0012. Registers no tasks.

    `set_as_current` defaults to `False`: an app built here (e.g. by `Container`,
    for the API or a producer process) must never replace `celery.current_app`.
    Only the worker's `-A` app (`autoapplier.worker.celery_app`) opts in, since some
    Celery internals (Beat, the `-A` CLI) expect the app they were given to be current.
    """
    app = Celery(main, set_as_current=set_as_current)
    app.conf.update(
        broker_url=settings.redis_url,
        result_backend=settings.redis_url,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,
        broker_transport_options={
            "visibility_timeout": 3600,
            "socket_connect_timeout": _SOCKET_CONNECT_TIMEOUT_S,
            "socket_timeout": _SOCKET_TIMEOUT_S,
        },
        result_backend_transport_options={
            "socket_connect_timeout": _SOCKET_CONNECT_TIMEOUT_S,
            "socket_timeout": _SOCKET_TIMEOUT_S,
        },
        result_expires=86400,
        task_default_queue=QUEUE_DEFAULT,
        broker_connection_retry_on_startup=True,
        timezone="UTC",
    )
    return app
