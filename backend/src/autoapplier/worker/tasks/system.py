"""System-level Celery tasks (ADR-0012): liveness and the heartbeat refresh.

Thin sync functions, per the ADR-0012 async bridge — neither task here needs
`autoapplier.worker.runtime.AsyncRuntime` since neither calls an async service.
"""

import socket

from celery import shared_task

from autoapplier import __version__
from autoapplier.config import get_settings
from autoapplier.kv.client import create_sync_redis
from autoapplier.kv.heartbeat import write_heartbeat
from autoapplier.worker.jobs import SYSTEM_HEARTBEAT, SYSTEM_PING


@shared_task(name=SYSTEM_PING)
def ping(nonce: str) -> str:
    """Echo `nonce` back — proves a producer, the broker and a worker are wired up."""
    return nonce


@shared_task(name=SYSTEM_HEARTBEAT, ignore_result=True)
def heartbeat() -> None:
    """Refresh the worker heartbeat key; scheduled by Beat every `worker_heartbeat_interval_s`."""
    settings = get_settings()
    write_heartbeat(
        create_sync_redis(settings.redis_url),
        prefix=settings.redis_key_prefix,
        worker=socket.gethostname(),
        version=__version__,
        ttl_s=settings.queue_heartbeat_max_age_s,
    )
