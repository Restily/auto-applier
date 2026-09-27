"""The Celery app (ADR-0012): the `-A` target for `celery worker` and `celery beat`.

    celery -A autoapplier.worker.celery_app worker ...
    celery -A autoapplier.worker.celery_app beat ...

Importing this module builds the configured app, registers the `system.*` tasks,
sets the Beat schedule and connects the `worker_ready` heartbeat signal — everything
both processes need from one entry point.
"""

from celery import Celery
from celery.signals import worker_ready

from autoapplier.adapters.queue.celery_factory import create_celery_app
from autoapplier.config import get_settings
from autoapplier.worker.schedule import build_beat_schedule
from autoapplier.worker.signals import write_ready_heartbeat
from autoapplier.worker.tasks import system  # noqa: F401  (registers system.* tasks on import)

app: Celery = create_celery_app(get_settings())
app.conf.beat_schedule = build_beat_schedule(get_settings())

worker_ready.connect(write_ready_heartbeat)
