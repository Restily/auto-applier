"""Worker heartbeat: a TTL'd Redis key proving broker + Beat + worker are alive (ADR-0012).

Written on the `worker_ready` signal and refreshed by the `system.heartbeat`
Beat task (Task 4B); `/health`'s queue check reads it back and compares its
age to `Settings.queue_heartbeat_max_age_s`.
"""

import json
from dataclasses import dataclass
from datetime import UTC, datetime

import redis

from autoapplier.kv.keys import HEARTBEAT_WORKER, key


@dataclass(frozen=True, slots=True)
class Heartbeat:
    """A worker's last-known-alive signal."""

    worker: str
    version: str
    at: datetime  # UTC-aware


def write_heartbeat(
    client: redis.Redis,
    *,
    prefix: str,
    worker: str,
    version: str,
    ttl_s: float,
    now: datetime | None = None,
) -> None:
    """`SET <prefix>heartbeat:worker <json> PX ttl_s*1000`, overwriting any previous value."""
    at = now if now is not None else datetime.now(UTC)
    payload = {"worker": worker, "version": version, "at": at.isoformat()}
    client.set(key(prefix, *HEARTBEAT_WORKER), json.dumps(payload), px=round(ttl_s * 1000))


async def read_heartbeat(client: redis.asyncio.Redis, *, prefix: str) -> Heartbeat | None:
    """Read and parse the heartbeat at `prefix`. `None` if missing or unparsable."""
    raw = await client.get(key(prefix, *HEARTBEAT_WORKER))
    if raw is None:
        return None
    try:
        payload = json.loads(raw)
        return Heartbeat(
            worker=payload["worker"],
            version=payload["version"],
            at=datetime.fromisoformat(payload["at"]),
        )
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None


def heartbeat_age_s(heartbeat: Heartbeat | None, now: datetime) -> float | None:
    """Seconds between `heartbeat.at` and `now`. `None` when there is no heartbeat."""
    if heartbeat is None:
        return None
    return (now - heartbeat.at).total_seconds()
