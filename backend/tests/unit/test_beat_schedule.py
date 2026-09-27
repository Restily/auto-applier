"""Unit tests for the Celery Beat schedule and task registration (ADR-0012)."""

from autoapplier.config import Settings
from autoapplier.worker.celery_app import app
from autoapplier.worker.jobs import SYSTEM_HEARTBEAT, SYSTEM_PING
from autoapplier.worker.schedule import build_beat_schedule


def test_heartbeat_scheduled_every_interval(settings: Settings) -> None:
    schedule = build_beat_schedule(settings)

    entry = schedule["system.heartbeat"]
    assert entry["task"] == SYSTEM_HEARTBEAT
    assert entry["schedule"] == settings.worker_heartbeat_interval_s


def test_celery_app_uses_schedule_and_registers_system_tasks() -> None:
    assert SYSTEM_PING in app.tasks
    assert SYSTEM_HEARTBEAT in app.tasks
    assert app.conf.beat_schedule["system.heartbeat"]["task"] == SYSTEM_HEARTBEAT
