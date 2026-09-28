"""Integration: upload API -> Storage + Postgres -> extraction, with the fake LLM."""

import time
from collections.abc import AsyncIterator, Awaitable, Callable
from pathlib import Path
from uuid import UUID

import httpx
import pytest

from autoapplier.adapters.queue.fake import InMemoryJobQueue
from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.db.resumes import PgResumeStore
from autoapplier.ports.jobs import RESUME_EXTRACT
from autoapplier.services.resumes import RESUME_BUCKET, ResumeService
from autoapplier.wiring import Container, build_container, close_container

from .supabase_helpers import TestUser

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "resumes"
MakeUser = Callable[..., Awaitable[TestUser]]


@pytest.fixture
async def container(supabase_secret: str) -> AsyncIterator[Container]:
    built = await build_container(Settings(llm_provider="fake"))
    built.queue = InMemoryJobQueue()
    built.resumes = ResumeService(PgResumeStore(built.pool), built.storage, built.queue)
    yield built
    await close_container(built)


@pytest.fixture
async def client(container: Container) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(create_app(container=container)), base_url="http://test"
    ) as api:
        yield api


def _auth(user: TestUser) -> dict[str, str]:
    return {"Authorization": f"Bearer {user.access_token}"}


async def _upload(
    client: httpx.AsyncClient, user: TestUser, name: str, fixture: str
) -> httpx.Response:
    return await client.post(
        "/v1/resumes",
        files={"file": (name, (FIXTURES / fixture).read_bytes())},
        headers=_auth(user),
    )


async def _cleanup(container: Container, user: TestUser) -> None:
    paths = await container.storage.list_paths(bucket=RESUME_BUCKET, prefix=str(user.id))
    if paths:
        await container.storage.remove(bucket=RESUME_BUCKET, paths=paths)


async def test_upload_then_extract_ready_under_60s(
    container: Container, client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user()
    started = time.monotonic()
    try:
        response = await _upload(client, user, "cv.pdf", "resume-text.pdf")
        assert response.status_code == 202
        resume_id = UUID(response.json()["id"])
        queue = container.queue
        assert isinstance(queue, InMemoryJobQueue)
        assert [(j.task_name, j.args) for j in queue.enqueued] == [
            (RESUME_EXTRACT, (str(resume_id),))
        ]

        assert await container.resume_extraction.extract(resume_id) == "ready"

        row = await PgResumeStore(container.pool).get(resume_id)
        assert row is not None
        assert row.status == "ready"
        assert row.extracted is not None
        assert row.extracted["full_name"] == "Alex Ivanov"
        assert time.monotonic() - started < 60
    finally:
        await _cleanup(container, user)


async def test_rejected_upload_stores_nothing(
    container: Container, client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user()
    response = await _upload(client, user, "cv.pdf", "png-renamed.pdf")
    assert response.status_code == 422
    assert await container.storage.list_paths(bucket=RESUME_BUCKET, prefix=str(user.id)) == []
    count = await container.pool.fetchval(
        "select count(*) from public.resumes where user_id = $1", user.id
    )
    assert count == 0


async def test_scanned_pdf_ends_unreadable_with_file_kept(
    container: Container, client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user()
    try:
        response = await _upload(client, user, "scan.pdf", "scanned.pdf")
        assert response.status_code == 202
        resume_id = UUID(response.json()["id"])

        assert await container.resume_extraction.extract(resume_id) == "failed"

        row = await PgResumeStore(container.pool).get(resume_id)
        assert row is not None
        assert row.error_code == "unreadable"
        paths = await container.storage.list_paths(bucket=RESUME_BUCKET, prefix=str(user.id))
        assert paths == [row.storage_path]
    finally:
        await _cleanup(container, user)


async def test_replace_keeps_only_latest_object_and_row(
    container: Container, client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user()
    try:
        first = await _upload(client, user, "a.pdf", "resume-text.pdf")
        second = await _upload(client, user, "b.docx", "resume.docx")
        assert first.status_code == second.status_code == 202
        rows = await container.pool.fetch(
            "select id from public.resumes where user_id = $1", user.id
        )
        assert [row["id"] for row in rows] == [UUID(second.json()["id"])]
        paths = await container.storage.list_paths(bucket=RESUME_BUCKET, prefix=str(user.id))
        assert len(paths) == 1
        assert paths[0].endswith(".docx")
    finally:
        await _cleanup(container, user)
