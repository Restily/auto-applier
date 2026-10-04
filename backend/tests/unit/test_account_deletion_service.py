"""AccountDeletionService orchestration and ResumeFilesPurge (fakes only)."""

from uuid import UUID

import pytest

from autoapplier.adapters.auth.fake import FakeAuthAdmin
from autoapplier.adapters.storage.fake import InMemoryFileStorage
from autoapplier.ports.auth import AuthClaims
from autoapplier.services.account_deletion import (
    AccountDeletionFailed,
    AccountDeletionService,
    ConfirmationMismatch,
    ResumeFilesPurge,
)

USER = UUID("3f2b8f0e-6a55-4c33-9d0e-1f2a3b4c5d6e")
OTHER = UUID("4f2b8f0e-6a55-4c33-9d0e-1f2a3b4c5d6e")
CLAIMS = AuthClaims(
    user_id=USER,
    email="Me@Example.test",
    role="authenticated",
    session_id=None,
    raw={"sub": str(USER), "role": "authenticated"},
)


class _Step:
    def __init__(self, name: str, log: list[str], *, fail: bool = False) -> None:
        self.name = name
        self.log = log
        self.fail = fail

    async def purge(self, user_id: UUID) -> None:
        self.log.append(f"{self.name}:{user_id}")
        if self.fail:
            raise RuntimeError("boom")


async def test_mismatch_calls_nothing() -> None:
    log: list[str] = []
    admin = FakeAuthAdmin()
    service = AccountDeletionService(admin, [_Step("a", log)])
    with pytest.raises(ConfirmationMismatch):
        await service.delete(CLAIMS, confirm_email="other@example.test")
    assert log == []
    assert admin.deleted == []


async def test_steps_run_before_auth_delete() -> None:
    log: list[str] = []
    admin = FakeAuthAdmin()
    service = AccountDeletionService(admin, [_Step("a", log), _Step("b", log)])
    await service.delete(CLAIMS, confirm_email=" me@example.test ")
    # Purge runs before the Auth delete and again after it (idempotent sweep for files
    # uploaded while the deletion was in flight).
    assert log == [f"a:{USER}", f"b:{USER}", f"a:{USER}", f"b:{USER}"]
    assert admin.deleted == [USER]


async def test_repurge_after_auth_delete_failure_is_not_run() -> None:
    log: list[str] = []
    admin = FakeAuthAdmin()
    admin.fail_next()
    service = AccountDeletionService(admin, [_Step("a", log)])
    with pytest.raises(AccountDeletionFailed):
        await service.delete(CLAIMS, confirm_email="me@example.test")
    assert log == [f"a:{USER}"]


async def test_repurge_failure_after_auth_delete_does_not_fail_the_deletion(
    caplog: pytest.LogCaptureFixture,
) -> None:
    class _FlakySecondPass:
        name = "flaky"

        def __init__(self) -> None:
            self.calls = 0

        async def purge(self, user_id: UUID) -> None:
            self.calls += 1
            if self.calls == 2:
                raise RuntimeError("SECRET-DETAIL")

    step = _FlakySecondPass()
    admin = FakeAuthAdmin()
    service = AccountDeletionService(admin, [step])
    await service.delete(CLAIMS, confirm_email="me@example.test")
    assert admin.deleted == [USER]
    assert step.calls == 2
    assert "RuntimeError" in caplog.text
    assert "SECRET-DETAIL" not in caplog.text


async def test_step_failure_stops_before_auth_delete() -> None:
    log: list[str] = []
    admin = FakeAuthAdmin()
    service = AccountDeletionService(
        admin, [_Step("a", log), _Step("b", log, fail=True), _Step("c", log)]
    )
    with pytest.raises(AccountDeletionFailed):
        await service.delete(CLAIMS, confirm_email="me@example.test")
    assert log == [f"a:{USER}", f"b:{USER}"]
    assert admin.deleted == []


async def test_admin_failure_raises_failed() -> None:
    admin = FakeAuthAdmin()
    admin.fail_next()
    service = AccountDeletionService(admin, [])
    with pytest.raises(AccountDeletionFailed):
        await service.delete(CLAIMS, confirm_email="me@example.test")
    assert admin.deleted == []


async def test_retry_after_failure_succeeds() -> None:
    admin = FakeAuthAdmin()
    admin.fail_next()
    service = AccountDeletionService(admin, [])
    with pytest.raises(AccountDeletionFailed):
        await service.delete(CLAIMS, confirm_email="me@example.test")
    await service.delete(CLAIMS, confirm_email="me@example.test")
    assert admin.deleted == [USER]


async def test_resume_files_purge_removes_only_that_users_prefix() -> None:
    storage = InMemoryFileStorage()
    for owner in (USER, OTHER):
        for name in ("a.pdf", "b.pdf"):
            await storage.put(
                bucket="resumes", path=f"{owner}/{name}", data=b"x", content_type="application/pdf"
            )
    await ResumeFilesPurge(storage).purge(USER)
    assert await storage.list_paths(bucket="resumes", prefix=str(USER)) == []
    assert len(await storage.list_paths(bucket="resumes", prefix=str(OTHER))) == 2
    await ResumeFilesPurge(storage).purge(USER)  # idempotent
