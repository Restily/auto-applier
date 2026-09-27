"""Health domain: pure aggregation and decision rules behind the `/health` endpoint.

No IO here — `autoapplier.services.health.HealthService` runs the actual probes
(database, queue) and feeds their results through `aggregate`; `kv.probes.QueueProbe`
feeds a broker-reachability flag and a heartbeat age through `queue_check`. See
ADR-0012 for the worker heartbeat contract this reasons about.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

CheckStatus = Literal["ok", "down"]
OverallStatus = Literal["ok", "degraded"]


@dataclass(frozen=True, slots=True)
class CheckResult:
    """The outcome of one named health check."""

    status: CheckStatus
    latency_ms: float
    detail: str | None = None


@dataclass(frozen=True, slots=True)
class HealthReport:
    """The `/health` response body: overall status plus every named check."""

    status: OverallStatus
    version: str
    checks: Mapping[str, CheckResult]


def aggregate(version: str, checks: Mapping[str, CheckResult]) -> HealthReport:
    """Combine `checks` into a `HealthReport`.

    Overall status is `"ok"` iff `checks` is non-empty and every check is
    `"ok"`; an empty mapping (nothing was actually checked) counts as
    `"degraded"`, never `"ok"`.
    """
    all_ok = bool(checks) and all(check.status == "ok" for check in checks.values())
    status: OverallStatus = "ok" if all_ok else "degraded"
    return HealthReport(status=status, version=version, checks=checks)


def queue_check(
    *,
    broker_reachable: bool,
    heartbeat_age_s: float | None,
    max_age_s: float,
    latency_ms: float,
) -> CheckResult:
    """Decide the queue check from a broker PING and the worker heartbeat age (ADR-0012).

    Checked in order: the broker must answer PING, a heartbeat must exist, and
    it must be no older than `max_age_s` — a fresh heartbeat is the only proof
    that the broker, Beat and a worker are all alive.
    """
    if not broker_reachable:
        return CheckResult(status="down", latency_ms=latency_ms, detail="queue broker unreachable")
    if heartbeat_age_s is None:
        return CheckResult(
            status="down",
            latency_ms=latency_ms,
            detail="no worker heartbeat (worker or beat not running)",
        )
    if heartbeat_age_s > max_age_s:
        return CheckResult(
            status="down",
            latency_ms=latency_ms,
            detail=f"worker heartbeat {round(heartbeat_age_s)}s old (max {round(max_age_s)}s)",
        )
    return CheckResult(status="ok", latency_ms=latency_ms, detail=None)
