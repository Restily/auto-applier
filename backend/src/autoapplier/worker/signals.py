"""Celery signal handlers (ADR-0012). `celery_app.py` connects these to their signal."""

import socket

from autoapplier import __version__
from autoapplier.config import get_settings
from autoapplier.kv.client import create_sync_redis
from autoapplier.kv.heartbeat import write_heartbeat


def write_ready_heartbeat(**_: object) -> None:
    """Write the heartbeat immediately, connected to `celery.signals.worker_ready`.

    Without this, `/health` would only go green after Beat's first tick (up to
    `worker_heartbeat_interval_s` after the worker actually became ready).
    """
    settings = get_settings()
    write_heartbeat(
        create_sync_redis(settings.redis_url),
        prefix=settings.redis_key_prefix,
        worker=socket.gethostname(),
        version=__version__,
        ttl_s=settings.queue_heartbeat_max_age_s,
    )
