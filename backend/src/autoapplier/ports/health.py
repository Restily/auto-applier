"""Health probe port: one named check that `services.health.HealthService` runs.

Adapters implement this per dependency (`db.probes.DatabaseProbe`,
`kv.probes.QueueProbe`, ...); the service never knows which one it is holding.
"""

from typing import Protocol

from autoapplier.domain.health import CheckResult


class HealthProbe(Protocol):
    """A named, awaitable check of one external dependency."""

    name: str

    async def check(self) -> CheckResult: ...
