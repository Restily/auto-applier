"""`GET /health` (Task 6): database and queue checks, no auth.

`200` when both are `"ok"`, `503` with the same body otherwise — never a 500, and the
process never hangs waiting on a down dependency (each probe is bounded by
`Settings.health_probe_timeout_s`, see `services.health.HealthService`).
"""

from typing import cast

from fastapi import APIRouter, Request, Response

from autoapplier.api.schemas.health import CheckOut, ChecksOut, HealthResponse
from autoapplier.domain.health import CheckResult
from autoapplier.wiring import Container

router = APIRouter()


def _to_check_out(result: CheckResult) -> CheckOut:
    return CheckOut(status=result.status, latency_ms=result.latency_ms, detail=result.detail)


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={503: {"model": HealthResponse}},
    operation_id="get_health",
)
async def get_health(request: Request, response: Response) -> HealthResponse:
    """Report database and queue health; sets `Cache-Control: no-store`."""
    container = cast(Container, request.app.state.container)
    report = await container.health.report()

    response.status_code = 200 if report.status == "ok" else 503
    response.headers["Cache-Control"] = "no-store"
    return HealthResponse(
        status=report.status,
        version=report.version,
        checks=ChecksOut(
            database=_to_check_out(report.checks["database"]),
            queue=_to_check_out(report.checks["queue"]),
        ),
    )
