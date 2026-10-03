"""Problem-details error handling: every error leaves the API as `application/problem+json`."""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from autoapplier.api.schemas.problem import FieldError, Problem

MEDIA_TYPE = "application/problem+json"
_log = logging.getLogger(__name__)


class ApiProblem(Exception):
    """Raise from routes/services to return a problem response with a stable `code`."""

    def __init__(
        self,
        status: int,
        code: str,
        title: str,
        detail: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(f"{code}: {title}")
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail
        self.headers = headers


def _response(problem: Problem, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse(
        problem.model_dump(mode="json", exclude_none=True),
        status_code=problem.status,
        media_type=MEDIA_TYPE,
        headers=headers,
    )


def install_problem_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiProblem)
    async def _api_problem(_: Request, exc: ApiProblem) -> JSONResponse:
        problem = Problem(title=exc.title, status=exc.status, detail=exc.detail, code=exc.code)
        return _response(problem, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors: list[Any] = [FieldError(loc=list(e["loc"]), type=e["type"]) for e in exc.errors()]
        problem = Problem(
            title="Invalid request", status=422, code="request.invalid", errors=errors
        )
        return _response(problem)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "not_found" if exc.status_code == 404 else f"http.{exc.status_code}"
        problem = Problem(title=str(exc.detail), status=exc.status_code, code=code)
        return _response(problem, dict(exc.headers) if exc.headers else None)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        _log.error("unhandled exception", exc_info=exc)
        return _response(Problem(title="Internal error", status=500, code="internal"))
