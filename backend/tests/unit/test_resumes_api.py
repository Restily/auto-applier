"""ASGI tests for the resume routes (fake container: in-memory store, storage, queue)."""

from collections.abc import AsyncIterator
from pathlib import Path
from typing import cast
from uuid import UUID, uuid4

import asyncpg
import httpx
import redis
from celery import Celery

from autoapplier.adapters.auth.fake import FakeAuthAdmin, FakeTokenVerifier
from autoapplier.adapters.documents.pypdf_docx import PyPdfDocxTextExtractor
from autoapplier.adapters.llm.fake import FakeLLMProvider
from autoapplier.adapters.queue.fake import InMemoryJobQueue
from autoapplier.adapters.storage.fake import InMemoryFileStorage
from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.ports.auth import AuthClaims
from autoapplier.services.account_deletion import AccountDeletionService
from autoapplier.services.account_export import AccountExportService
from autoapplier.services.health import HealthService
from autoapplier.services.resume_extraction import ResumeExtractionService
from autoapplier.services.resumes import ResumeService
from autoapplier.wiring import Container

from .doubles.documents import InlineDocumentExtractor
from .doubles.resume_store import InMemoryResumeStore

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "resumes"
USER = UUID("3f2b8f0e-6a55-4c33-9d0e-1f2a3b4c5d6e")
OTHER = UUID("4f2b8f0e-6a55-4c33-9d0e-1f2a3b4c5d6e")


def _claims(user: UUID) -> AuthClaims:
    return AuthClaims(
        user_id=user,
        email="a@example.test",
        role="authenticated",
        session_id="s",
        raw={"sub": str(user), "role": "authenticated"},
    )


class _Env:
    def __init__(self) -> None:
        self.store = InMemoryResumeStore()
        self.storage = InMemoryFileStorage()
        self.queue = InMemoryJobQueue()
        llm = FakeLLMProvider()
        documents = PyPdfDocxTextExtractor()
        container = Container(
            settings=Settings(_env_file=None),
            pool=cast(asyncpg.Pool, None),
            redis=cast(redis.asyncio.Redis, None),
            health=cast(HealthService, None),
            llm=llm,
            queue=self.queue,
            celery_app=cast(Celery, None),
            http=cast(httpx.AsyncClient, None),
            tokens=FakeTokenVerifier({"tok-a": _claims(USER), "tok-b": _claims(OTHER)}),
            auth_admin=FakeAuthAdmin(),
            storage=self.storage,
            documents=documents,
            resumes=ResumeService(self.store, self.storage, self.queue),
            resume_extraction=ResumeExtractionService(
                self.store, self.storage, InlineDocumentExtractor(documents), llm
            ),
            account_export=cast(AccountExportService, None),
            account_deletion=cast(AccountDeletionService, None),
        )
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(create_app(container=container)),
            base_url="http://test",
        )


def _auth(who: str = "tok-a") -> dict[str, str]:
    return {"Authorization": f"Bearer {who}"}


async def _upload(env: _Env, name: str, data: bytes, who: str = "tok-a") -> httpx.Response:
    return await env.client.post(
        "/v1/resumes",
        files={"file": (name, data, "application/octet-stream")},
        headers=_auth(who),
    )


async def test_upload_202_returns_resume() -> None:
    env = _Env()
    response = await _upload(env, "cv.pdf", (FIXTURES / "resume-text.pdf").read_bytes())
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "processing"
    assert body["file_name"] == "cv.pdf"
    assert body["mime_type"] == "application/pdf"
    assert body["error_code"] is None
    assert len(env.queue.enqueued) == 1


async def test_content_length_over_limit_rejected_before_parsing() -> None:
    env = _Env()
    response = await env.client.post(
        "/v1/resumes",
        content=b"x",
        headers={
            **_auth(),
            "Content-Length": str(100 * 1024 * 1024),
            "Content-Type": "multipart/form-data; boundary=x",
        },
    )
    assert response.status_code == 413
    assert response.json()["code"] == "request.too_large"
    assert env.storage.objects == {}


async def _chunks(total: int, chunk: int = 64 * 1024) -> AsyncIterator[bytes]:
    sent = 0
    while sent < total:
        piece = min(chunk, total - sent)
        sent += piece
        yield b"x" * piece


async def test_chunked_body_without_content_length_rejected_while_streaming() -> None:
    env = _Env()
    consumed = 0

    async def body() -> AsyncIterator[bytes]:
        nonlocal consumed
        async for piece in _chunks(50 * 1024 * 1024):
            consumed += len(piece)
            yield piece

    response = await env.client.post(
        "/v1/resumes",
        content=body(),
        headers={**_auth(), "Content-Type": "multipart/form-data; boundary=x"},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "request.too_large"
    assert env.storage.objects == {}
    # The server stopped reading shortly after the limit instead of buffering 50 MiB.
    assert consumed < 8 * 1024 * 1024


async def test_false_content_length_cannot_bypass_the_limit() -> None:
    env = _Env()
    response = await env.client.post(
        "/v1/resumes",
        content=_chunks(20 * 1024 * 1024),
        headers={
            **_auth(),
            "Content-Length": "100",
            "Content-Type": "multipart/form-data; boundary=x",
        },
    )
    assert response.status_code == 413
    assert response.json()["code"] == "request.too_large"
    assert env.storage.objects == {}


async def test_valid_upload_still_works_when_body_is_streamed_in_chunks() -> None:
    env = _Env()
    data = (FIXTURES / "resume-text.pdf").read_bytes()
    boundary = "bnd"
    payload = (
        (
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="cv.pdf"\r\n'
            "Content-Type: application/pdf\r\n\r\n"
        ).encode()
        + data
        + f"\r\n--{boundary}--\r\n".encode()
    )

    async def parts() -> AsyncIterator[bytes]:
        for start in range(0, len(payload), 1000):
            yield payload[start : start + 1000]

    response = await env.client.post(
        "/v1/resumes",
        content=parts(),
        headers={**_auth(), "Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    assert response.status_code == 202
    assert len(env.queue.enqueued) == 1


async def test_unsupported_type_422_code() -> None:
    env = _Env()
    response = await _upload(env, "cv.pdf", (FIXTURES / "png-renamed.pdf").read_bytes())
    assert response.status_code == 422
    assert response.json()["code"] == "resume.unsupported_type"
    assert env.storage.objects == {}


async def test_empty_422_code() -> None:
    env = _Env()
    response = await _upload(env, "cv.pdf", b"")
    assert response.status_code == 422
    assert response.json()["code"] == "resume.empty"


async def test_too_large_413_code() -> None:
    env = _Env()
    data = b"%PDF-1.4\n" + b"x" * (5 * 1024 * 1024)
    response = await _upload(env, "cv.pdf", data)
    assert response.status_code == 413
    assert response.json()["code"] == "resume.too_large"


async def test_missing_file_field_422() -> None:
    env = _Env()
    response = await env.client.post("/v1/resumes", data={"other": "x"}, headers=_auth())
    assert response.status_code == 422


async def test_requires_auth_401() -> None:
    env = _Env()
    response = await env.client.post("/v1/resumes", files={"file": ("cv.pdf", b"%PDF-1.4")})
    assert response.status_code == 401
    retry = await env.client.post(f"/v1/resumes/{uuid4()}/extraction")
    assert retry.status_code == 401


async def test_retry_other_users_resume_is_404() -> None:
    env = _Env()
    upload = await _upload(env, "cv.pdf", (FIXTURES / "resume-text.pdf").read_bytes())
    resume_id = UUID(upload.json()["id"])
    await env.store.mark_failed(resume_id, "ai_failed")
    response = await env.client.post(f"/v1/resumes/{resume_id}/extraction", headers=_auth("tok-b"))
    assert response.status_code == 404
    assert response.json()["code"] == "resume.not_found"


async def test_retry_not_retryable_409() -> None:
    env = _Env()
    upload = await _upload(env, "cv.pdf", (FIXTURES / "resume-text.pdf").read_bytes())
    response = await env.client.post(
        f"/v1/resumes/{upload.json()['id']}/extraction", headers=_auth()
    )
    assert response.status_code == 409
    assert response.json()["code"] == "resume.not_retryable"


async def test_retry_failed_202() -> None:
    env = _Env()
    upload = await _upload(env, "cv.pdf", (FIXTURES / "resume-text.pdf").read_bytes())
    resume_id = UUID(upload.json()["id"])
    await env.store.mark_failed(resume_id, "unreadable")
    response = await env.client.post(f"/v1/resumes/{resume_id}/extraction", headers=_auth())
    assert response.status_code == 202
    assert response.json()["status"] == "processing"
