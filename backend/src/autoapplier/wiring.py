"""Composition root: wires services to port implementations for api and worker (Task 6).

`build_container` assembles one `Container` per process from `Settings` — an asyncpg pool,
an async Redis client, the `HealthService` (wired to `DatabaseProbe`/`QueueProbe`), the
configured `LLMProvider` and a `CeleryJobQueue`. Every piece is lazy (no socket opens at
build time: `db.pool.create_pool` uses `min_size=0`, `kv.client.create_async_redis` and
`adapters.queue.celery_factory.create_celery_app` connect on first use), so this never
raises just because Postgres or Valkey happen to be unreachable — that surfaces as a
"down" health check instead (`services.health.HealthService`, ADR-0012 Review Focus #1).
"""

from dataclasses import dataclass

import asyncpg
import redis

from autoapplier import __version__
from autoapplier.adapters.llm.registry import build_llm_provider
from autoapplier.adapters.queue.celery_factory import create_celery_app
from autoapplier.adapters.queue.celery_queue import CeleryJobQueue
from autoapplier.config import Settings
from autoapplier.db.pool import create_pool
from autoapplier.db.probes import DatabaseProbe
from autoapplier.kv.client import create_async_redis
from autoapplier.kv.probes import QueueProbe
from autoapplier.ports.llm import LLMProvider
from autoapplier.ports.queue import JobQueue
from autoapplier.services.health import HealthService


@dataclass
class Container:
    """Everything one process (the API, or a worker) needs, built once and reused."""

    settings: Settings
    pool: asyncpg.Pool
    redis: redis.asyncio.Redis
    health: HealthService
    llm: LLMProvider
    queue: JobQueue


async def build_container(settings: Settings) -> Container:
    """Build a `Container` from `settings`. Never raises when Postgres or Valkey are down."""
    pool = await create_pool(settings.database_url)
    redis_client = create_async_redis(settings.redis_url)
    health = HealthService(
        [
            DatabaseProbe(pool),
            QueueProbe(
                redis_client,
                key_prefix=settings.redis_key_prefix,
                max_heartbeat_age_s=settings.queue_heartbeat_max_age_s,
            ),
        ],
        version=__version__,
        timeout_s=settings.health_probe_timeout_s,
    )
    return Container(
        settings=settings,
        pool=pool,
        redis=redis_client,
        health=health,
        llm=build_llm_provider(settings),
        queue=CeleryJobQueue(create_celery_app(settings)),
    )


async def close_container(container: Container) -> None:
    """Close the pool and the redis client. Safe even if neither ever connected."""
    await container.pool.close()
    await container.redis.aclose()
