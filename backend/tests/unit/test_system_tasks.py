"""Unit tests for the `system.*` Celery tasks (ADR-0012).

`Task.apply()` runs the task body synchronously in-process (eager execution) — no
broker, no Valkey, no worker needed — so this stays a unit test.
"""

from autoapplier.worker.tasks.system import ping


def test_ping_echoes_nonce() -> None:
    result = ping.apply(args=["n1"]).get()

    assert result == "n1"
