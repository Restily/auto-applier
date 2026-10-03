"""Canonical Celery task names (ADR-0012): namespaced, and defined once here so
producers (`JobQueue.enqueue`) and tasks never hardcode the string independently.
"""

from typing import Final

SYSTEM_PING: Final = "system.ping"
SYSTEM_HEARTBEAT: Final = "system.heartbeat"

from autoapplier.ports.jobs import RESUME_EXTRACT as RESUME_EXTRACT  # noqa: E402  (re-export)
