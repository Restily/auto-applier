"""Unit tests for `create_celery_app`'s configuration (ADR-0012): JSON, Redis, no ETA/countdown."""

from autoapplier.adapters.queue.celery_factory import create_celery_app
from autoapplier.config import Settings


def test_json_only_serialization(settings: Settings) -> None:
    app = create_celery_app(settings)

    assert app.conf.task_serializer == "json"
    assert app.conf.result_serializer == "json"
    assert list(app.conf.accept_content) == ["json"]


def test_acks_late_and_prefetch_one(settings: Settings) -> None:
    app = create_celery_app(settings)

    assert app.conf.task_acks_late is True
    assert app.conf.task_reject_on_worker_lost is True
    assert app.conf.worker_prefetch_multiplier == 1


def test_visibility_timeout_at_least_one_hour(settings: Settings) -> None:
    app = create_celery_app(settings)

    assert app.conf.broker_transport_options["visibility_timeout"] >= 3600


def test_broker_and_backend_use_redis_url() -> None:
    settings = Settings(_env_file=None, redis_url="redis://127.0.0.1:6399/2")

    app = create_celery_app(settings)

    assert app.conf.broker_url == "redis://127.0.0.1:6399/2"
    assert app.conf.result_backend == "redis://127.0.0.1:6399/2"


def test_broker_and_backend_have_socket_timeouts(settings: Settings) -> None:
    """Mirrors `kv/client.py`'s 2 s timeouts so a down/slow broker fails fast."""
    app = create_celery_app(settings)

    broker_opts = app.conf.broker_transport_options
    assert broker_opts["socket_connect_timeout"] == 2
    assert broker_opts["socket_timeout"] == 2
    assert broker_opts["visibility_timeout"] >= 3600

    backend_opts = app.conf.result_backend_transport_options
    assert backend_opts["socket_connect_timeout"] == 2
    assert backend_opts["socket_timeout"] == 2


def test_does_not_become_current_app_by_default(settings: Settings) -> None:
    """A producer app (API/worker `Container`) must never hijack `celery.current_app`."""
    import celery

    previous_current = celery.current_app

    app = create_celery_app(settings)

    assert celery.current_app is previous_current
    assert celery.current_app is not app


def test_set_as_current_true_opts_in(settings: Settings) -> None:
    """Only the worker `-A` app opts in, e.g. `autoapplier.worker.celery_app`."""
    app = create_celery_app(settings, set_as_current=True)

    assert app.conf.broker_url == settings.redis_url
