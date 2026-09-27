"""Health service: runs every configured probe concurrently and aggregates a report.

Each probe gets a shared `timeout_s` (`Settings.health_probe_timeout_s`) to
answer. A probe that times out, or raises for any other reason, comes back
`"down"` with a generic detail — never the raw exception message, which can
carry a DSN or password (the `/health` contract never exposes secrets or
connection strings).
"""

import asyncio
import time
from collections.abc import Sequence

from autoapplier.domain.health import CheckResult, HealthReport, aggregate
from autoapplier.ports.health import HealthProbe


class HealthService:
    """Runs `probes` concurrently, each under its own `timeout_s`, and aggregates the result."""

    def __init__(self, probes: Sequence[HealthProbe], *, version: str, timeout_s: float) -> None:
        self._probes = probes
        self._version = version
        self._timeout_s = timeout_s

    async def report(self) -> HealthReport:
        """Run every probe concurrently and return the aggregated `HealthReport`."""
        pairs = await asyncio.gather(*(self._run(probe) for probe in self._probes))
        return aggregate(self._version, dict(pairs))

    async def _run(self, probe: HealthProbe) -> tuple[str, CheckResult]:
        start = time.monotonic()
        try:
            async with asyncio.timeout(self._timeout_s):
                result = await probe.check()
        except TimeoutError:
            result = CheckResult(
                status="down",
                latency_ms=self._elapsed_ms(start),
                detail=f"timed out after {self._timeout_s:g}s",
            )
        except Exception as exc:
            result = CheckResult(
                status="down",
                latency_ms=self._elapsed_ms(start),
                detail=f"check failed: {type(exc).__name__}",
            )
        return probe.name, result

    @staticmethod
    def _elapsed_ms(start: float) -> float:
        return (time.monotonic() - start) * 1000
