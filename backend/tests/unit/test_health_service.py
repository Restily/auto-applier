"""Unit tests for autoapplier.services.health.HealthService: concurrency, timeout, sanitization.

Uses small in-file stub probes (never the real db/kv adapters) so these tests
run with no network and no event-loop surprises.
"""

import asyncio
import time

from autoapplier.domain.health import CheckResult
from autoapplier.services.health import HealthService


class StubProbe:
    """A `HealthProbe` returning a fixed `result`, optionally after `delay_s` or by raising."""

    def __init__(
        self,
        name: str,
        *,
        result: CheckResult | None = None,
        delay_s: float = 0.0,
        error: Exception | None = None,
    ) -> None:
        self.name = name
        self._result = result
        self._delay_s = delay_s
        self._error = error

    async def check(self) -> CheckResult:
        if self._delay_s:
            await asyncio.sleep(self._delay_s)
        if self._error is not None:
            raise self._error
        assert self._result is not None
        return self._result


async def test_report_runs_all_probes() -> None:
    database = StubProbe("database", result=CheckResult(status="ok", latency_ms=1.0))
    queue = StubProbe("queue", result=CheckResult(status="ok", latency_ms=2.0))
    service = HealthService([database, queue], version="0.1.0", timeout_s=1.0)

    report = await service.report()

    assert report.version == "0.1.0"
    assert report.status == "ok"
    assert report.checks == {
        "database": CheckResult(status="ok", latency_ms=1.0),
        "queue": CheckResult(status="ok", latency_ms=2.0),
    }


async def test_slow_probe_times_out_as_down() -> None:
    slow = StubProbe("slow", delay_s=1.0)
    service = HealthService([slow], version="0.1.0", timeout_s=0.1)

    start = time.monotonic()
    report = await service.report()
    elapsed_s = time.monotonic() - start

    assert elapsed_s < 0.5
    assert report.checks["slow"].status == "down"
    assert report.checks["slow"].detail == "timed out after 0.1s"


async def test_probe_exception_detail_is_sanitized() -> None:
    failing = StubProbe("database", error=OSError("connect postgresql://postgres:s3cret@db:5432"))
    service = HealthService([failing], version="0.1.0", timeout_s=1.0)

    report = await service.report()

    detail = report.checks["database"].detail
    assert detail == "check failed: OSError"
    assert detail is not None
    assert "s3cret" not in detail


async def test_probes_run_concurrently() -> None:
    first = StubProbe("first", result=CheckResult(status="ok", latency_ms=0.0), delay_s=0.2)
    second = StubProbe("second", result=CheckResult(status="ok", latency_ms=0.0), delay_s=0.2)
    service = HealthService([first, second], version="0.1.0", timeout_s=1.0)

    start = time.monotonic()
    await service.report()
    elapsed_s = time.monotonic() - start

    assert elapsed_s < 0.35
