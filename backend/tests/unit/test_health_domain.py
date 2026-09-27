"""Unit tests for autoapplier.domain.health: pure aggregation and queue-check rules."""

from autoapplier.domain.health import CheckResult, HealthReport, aggregate, queue_check


def test_aggregate_ok_when_all_ok() -> None:
    checks = {
        "database": CheckResult(status="ok", latency_ms=1.0),
        "queue": CheckResult(status="ok", latency_ms=2.0),
    }

    report = aggregate("0.1.0", checks)

    assert report == HealthReport(status="ok", version="0.1.0", checks=checks)


def test_aggregate_degraded_when_any_down() -> None:
    checks = {
        "database": CheckResult(status="ok", latency_ms=1.0),
        "queue": CheckResult(status="down", latency_ms=2.0, detail="queue broker unreachable"),
    }

    report = aggregate("0.1.0", checks)

    assert report.status == "degraded"


def test_aggregate_degraded_when_no_checks() -> None:
    report = aggregate("0.1.0", {})

    assert report.status == "degraded"


def test_queue_check_ok_with_fresh_heartbeat() -> None:
    result = queue_check(broker_reachable=True, heartbeat_age_s=5.0, max_age_s=30.0, latency_ms=3.0)

    assert result == CheckResult(status="ok", latency_ms=3.0, detail=None)


def test_queue_check_down_without_heartbeat() -> None:
    result = queue_check(
        broker_reachable=True, heartbeat_age_s=None, max_age_s=30.0, latency_ms=3.0
    )

    assert result == CheckResult(
        status="down",
        latency_ms=3.0,
        detail="no worker heartbeat (worker or beat not running)",
    )


def test_queue_check_down_with_stale_heartbeat_detail_mentions_age() -> None:
    result = queue_check(
        broker_reachable=True, heartbeat_age_s=45.7, max_age_s=30.0, latency_ms=3.0
    )

    assert result.status == "down"
    assert result.detail == "worker heartbeat 46s old (max 30s)"


def test_queue_check_down_when_broker_unreachable() -> None:
    result = queue_check(
        broker_reachable=False, heartbeat_age_s=None, max_age_s=30.0, latency_ms=3.0
    )

    assert result == CheckResult(status="down", latency_ms=3.0, detail="queue broker unreachable")
