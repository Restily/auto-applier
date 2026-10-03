"""Unit tests for RFC 9457 problem handlers."""

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from autoapplier.api.errors import ApiProblem, install_problem_handlers


class _Body(BaseModel):
    n: int


def _app() -> FastAPI:
    app = FastAPI()
    install_problem_handlers(app)

    @app.get("/problem")
    async def problem() -> None:
        raise ApiProblem(404, "resume.not_found", "Resume not found", "no such id")

    @app.post("/validate")
    async def validate(body: _Body) -> None:
        return None

    @app.get("/boom")
    async def boom() -> None:
        raise RuntimeError("secret internal detail")

    return app


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(_app(), raise_app_exceptions=False), base_url="http://t"
    )


async def test_api_problem_serialized_as_problem_json() -> None:
    async with _client() as client:
        response = await client.get("/problem")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json() == {
        "type": "about:blank",
        "title": "Resume not found",
        "status": 404,
        "detail": "no such id",
        "code": "resume.not_found",
    }


async def test_validation_error_422_request_invalid_with_errors() -> None:
    async with _client() as client:
        response = await client.post("/validate", json={"n": "x"})

    body = response.json()
    assert response.status_code == 422
    assert body["code"] == "request.invalid"
    assert body["status"] == 422
    assert body["errors"] == [{"loc": ["body", "n"], "type": "int_parsing"}]
    assert "input" not in response.text


async def test_unhandled_exception_500_without_message() -> None:
    async with _client() as client:
        response = await client.get("/boom")

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "internal"
    assert "secret internal detail" not in response.text
