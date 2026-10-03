"""Unit tests for `ResumeService` (in-memory store, storage and queue)."""

from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid4

import pytest

from autoapplier.adapters.queue.fake import InMemoryJobQueue
from autoapplier.adapters.storage.fake import InMemoryFileStorage
from autoapplier.domain.resume_files import RESUME_MAX_BYTES
from autoapplier.ports.jobs import RESUME_EXTRACT
from autoapplier.ports.storage import StorageError
from autoapplier.services.resumes import (
    RESUME_BUCKET,
    STALE_PROCESSING_S,
    ResumeNotFound,
    ResumeNotRetryable,
    ResumeRejected,
    ResumeService,
)

from .doubles.resume_store import InMemoryResumeStore

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "resumes"
USER = uuid4()
OTHER = uuid4()


def _pdf(size: int | None = None) -> bytes:
    data = b"%PDF-1.4\n"
    return data if size is None else data + b"x" * (size - len(data))


class _Env:
    def __init__(self) -> None:
        self.clock = datetime(2026, 1, 1, tzinfo=UTC)
        self.store = InMemoryResumeStore(now=lambda: self.clock)
        self.storage = InMemoryFileStorage()
        self.queue = InMemoryJobQueue()
        self.service = ResumeService(self.store, self.storage, self.queue)


@pytest.fixture
def env() -> _Env:
    return _Env()


async def test_png_as_pdf_rejected_before_any_io(env: _Env) -> None:
    data = (FIXTURES / "png-renamed.pdf").read_bytes()
    with pytest.raises(ResumeRejected) as info:
        await env.service.upload(user_id=USER, file_name="cv.pdf", data=data)
    assert info.value.code == "resume.unsupported_type"
    assert env.storage.objects == {}
    assert env.store.rows == {}
    assert env.queue.enqueued == []


async def test_empty_file_rejected(env: _Env) -> None:
    with pytest.raises(ResumeRejected) as info:
        await env.service.upload(user_id=USER, file_name="cv.pdf", data=b"")
    assert info.value.code == "resume.empty"


async def test_exactly_max_bytes_accepted(env: _Env) -> None:
    record = await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf(RESUME_MAX_BYTES))
    assert record.size_bytes == RESUME_MAX_BYTES


async def test_one_byte_over_rejected_too_large(env: _Env) -> None:
    with pytest.raises(ResumeRejected) as info:
        await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf(RESUME_MAX_BYTES + 1))
    assert info.value.code == "resume.too_large"
    assert env.storage.objects == {}


async def test_upload_stores_object_row_and_enqueues(env: _Env) -> None:
    record = await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    path = f"{USER}/{record.id}.pdf"
    assert (RESUME_BUCKET, path) in env.storage.objects
    assert record.storage_path == path
    assert record.status == "processing"
    assert record.mime_type == "application/pdf"
    assert [(j.task_name, j.args) for j in env.queue.enqueued] == [
        (RESUME_EXTRACT, (str(record.id),))
    ]


async def test_replace_removes_previous_object_and_row(env: _Env) -> None:
    first = await env.service.upload(user_id=USER, file_name="a.pdf", data=_pdf())
    second = await env.service.upload(user_id=USER, file_name="b.pdf", data=_pdf())
    assert set(env.store.rows) == {second.id}
    assert list(env.storage.objects) == [(RESUME_BUCKET, second.storage_path)]
    assert first.id not in env.store.rows


async def test_storage_failure_leaves_no_row_and_no_job(env: _Env) -> None:
    env.storage.fail_next("put")
    with pytest.raises(StorageError):
        await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    assert env.store.rows == {}
    assert env.queue.enqueued == []


async def test_insert_failure_removes_uploaded_object(env: _Env) -> None:
    env.store.fail_insert = True
    with pytest.raises(RuntimeError):
        await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    assert env.storage.objects == {}
    assert env.queue.enqueued == []


async def _failed(env: _Env) -> UUID:
    record = await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    await env.store.mark_failed(record.id, "ai_failed")
    env.queue.enqueued.clear()
    return record.id


async def test_retry_other_users_resume_not_found(env: _Env) -> None:
    resume_id = await _failed(env)
    with pytest.raises(ResumeNotFound):
        await env.service.retry(user_id=OTHER, resume_id=resume_id)
    assert env.queue.enqueued == []


async def test_retry_unknown_id_not_found(env: _Env) -> None:
    with pytest.raises(ResumeNotFound):
        await env.service.retry(user_id=USER, resume_id=uuid4())


async def test_retry_ready_not_retryable(env: _Env) -> None:
    record = await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    await env.store.mark_ready(record.id, {"full_name": "A"})
    with pytest.raises(ResumeNotRetryable):
        await env.service.retry(user_id=USER, resume_id=record.id)


async def test_retry_failed_requeues(env: _Env) -> None:
    resume_id = await _failed(env)
    record = await env.service.retry(user_id=USER, resume_id=resume_id)
    assert record.status == "processing"
    assert record.error_code is None
    assert [(j.task_name, j.args) for j in env.queue.enqueued] == [
        (RESUME_EXTRACT, (str(resume_id),))
    ]


async def test_retry_fresh_processing_not_retryable(env: _Env) -> None:
    record = await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    env.clock += timedelta(seconds=STALE_PROCESSING_S - 1)
    with pytest.raises(ResumeNotRetryable):
        await env.service.retry(user_id=USER, resume_id=record.id)


async def test_retry_stale_processing(env: _Env) -> None:
    record = await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    env.queue.enqueued.clear()
    env.clock += timedelta(seconds=STALE_PROCESSING_S + 1)
    retried = await env.service.retry(user_id=USER, resume_id=record.id)
    assert retried.status == "processing"
    assert len(env.queue.enqueued) == 1


async def test_enqueue_failure_is_logged_and_upload_still_succeeds(env: _Env) -> None:
    async def boom(*_a: object, **_k: object) -> str:
        raise RuntimeError("broker down")

    env.queue.enqueue = boom  # type: ignore[method-assign]
    record = await env.service.upload(user_id=USER, file_name="cv.pdf", data=_pdf())
    assert record.status == "processing"
