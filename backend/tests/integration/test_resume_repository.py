"""Integration: `PgResumeStore` against the real local Postgres."""

from collections.abc import Awaitable, Callable
from uuid import UUID, uuid4

import asyncpg
import pytest

from autoapplier.db.resumes import PgResumeStore

from .supabase_helpers import TestUser

MakeUser = Callable[..., Awaitable[TestUser]]
PDF = "application/pdf"


async def _insert(store: PgResumeStore, user_id: UUID) -> tuple[UUID, str]:
    resume_id = uuid4()
    path = f"{user_id}/{resume_id}.pdf"
    await store.insert_current(
        user_id=user_id,
        resume_id=resume_id,
        storage_path=path,
        file_name="cv.pdf",
        mime_type=PDF,
        size_bytes=10,
    )
    return resume_id, path


async def test_insert_current_demotes_previous(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()
    store = PgResumeStore(pool)
    first_id, _ = await _insert(store, user.id)
    second, previous = await store.insert_current(
        user_id=user.id,
        resume_id=uuid4(),
        storage_path=f"{user.id}/second.pdf",
        file_name="b.pdf",
        mime_type=PDF,
        size_bytes=5,
    )
    assert previous is not None
    assert previous.id == first_id
    assert previous.is_current is False
    assert second.is_current is True
    assert second.status == "processing"
    current = await pool.fetch(
        "select id from public.resumes where user_id = $1 and is_current", user.id
    )
    assert [row["id"] for row in current] == [second.id]


async def test_get_for_user_hides_other_users_rows(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    owner, other = await make_user(), await make_user()
    store = PgResumeStore(pool)
    resume_id, _ = await _insert(store, owner.id)
    assert await store.get_for_user(user_id=owner.id, resume_id=resume_id) is not None
    assert await store.get_for_user(user_id=other.id, resume_id=resume_id) is None
    assert (
        await store.reset_for_retry(user_id=other.id, resume_id=resume_id, stale_after_s=0.0)
        is None
    )
    await store.delete(user_id=other.id, resume_id=resume_id)
    assert await store.get(resume_id) is not None


async def test_claim_only_once_while_processing(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()
    store = PgResumeStore(pool)
    resume_id, _ = await _insert(store, user.id)
    claimed = await store.claim_for_extraction(resume_id)
    assert claimed is not None
    assert claimed.attempts == 1
    await store.mark_ready(resume_id, {"full_name": "A"})
    assert await store.claim_for_extraction(resume_id) is None
    ready = await store.get(resume_id)
    assert ready is not None
    assert ready.status == "ready"
    assert ready.extracted == {"full_name": "A"}


async def test_mark_failed_and_reset(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()
    store = PgResumeStore(pool)
    resume_id, _ = await _insert(store, user.id)
    await store.mark_failed(resume_id, "unreadable")
    failed = await store.get(resume_id)
    assert failed is not None
    assert (failed.status, failed.error_code) == ("failed", "unreadable")
    reset = await store.reset_for_retry(user_id=user.id, resume_id=resume_id, stale_after_s=90)
    assert reset is not None
    assert (reset.status, reset.error_code) == ("processing", None)


async def test_reset_for_retry_respects_staleness(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()
    store = PgResumeStore(pool)
    resume_id, _ = await _insert(store, user.id)
    assert (
        await store.reset_for_retry(user_id=user.id, resume_id=resume_id, stale_after_s=90) is None
    )
    await pool.execute("alter table public.resumes disable trigger resumes_touch_updated_at")
    try:
        await pool.execute(
            "update public.resumes set updated_at = now() - interval '120 seconds' where id = $1",
            resume_id,
        )
    finally:
        await pool.execute("alter table public.resumes enable trigger resumes_touch_updated_at")
    stale = await store.reset_for_retry(user_id=user.id, resume_id=resume_id, stale_after_s=90)
    assert stale is not None
    assert stale.status == "processing"


@pytest.mark.parametrize("status", ["ready"])
async def test_ready_is_not_retryable(pool: asyncpg.Pool, make_user: MakeUser, status: str) -> None:
    user = await make_user()
    store = PgResumeStore(pool)
    resume_id, _ = await _insert(store, user.id)
    await store.mark_ready(resume_id, {"full_name": "A"})
    assert (
        await store.reset_for_retry(user_id=user.id, resume_id=resume_id, stale_after_s=0) is None
    )
