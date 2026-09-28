"""The Celery Beat schedule (ADR-0012).

`build_beat_schedule` returns Celery's `beat_schedule` mapping: entry name -> task,
schedule (a plain number of seconds is an interval), and per-run options. Later
milestones append more entries here (e.g. `apply.dispatch_due` every 60 s, M3);
they never use Celery's `eta`/`countdown` for anything but this fixed cadence.
"""

from typing import Any

from autoapplier.config import Settings
from autoapplier.worker.jobs import SYSTEM_HEARTBEAT


def build_beat_schedule(settings: Settings) -> dict[str, dict[str, Any]]:
    """Beat entries keyed by name: `system.heartbeat` runs every `worker_heartbeat_interval_s`."""
    return {
        "system.heartbeat": {
            "task": SYSTEM_HEARTBEAT,
            "schedule": settings.worker_heartbeat_interval_s,
            "options": {"expires": settings.worker_heartbeat_interval_s},
        }
    }
