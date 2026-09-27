"""`GET /health` response schemas (Task 6): the web contract — field names are final."""

from typing import Literal

from pydantic import BaseModel


class CheckOut(BaseModel):
    """One named check in the `/health` response."""

    status: Literal["ok", "down"]
    latency_ms: float
    detail: str | None


class ChecksOut(BaseModel):
    """Every check `/health` reports."""

    database: CheckOut
    queue: CheckOut


class HealthResponse(BaseModel):
    """The `GET /health` response body: never exposes secrets or connection strings."""

    status: Literal["ok", "degraded"]
    version: str
    checks: ChecksOut
