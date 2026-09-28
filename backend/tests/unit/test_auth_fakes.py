"""Tests for `FakeTokenVerifier` and `FakeAuthAdmin` (port conformance and behavior)."""

from uuid import UUID, uuid4

import pytest

from autoapplier.adapters.auth.fake import FakeAuthAdmin, FakeTokenVerifier
from autoapplier.ports.auth import AuthAdmin, AuthAdminError, AuthClaims, InvalidTokenError, TokenVerifier

UID = uuid4()
CLAIMS = AuthClaims(UID, "a@example.test", "authenticated", None, {"sub": str(UID)})


async def test_verifier_returns_known_and_rejects_unknown() -> None:
    verifier: TokenVerifier = FakeTokenVerifier({"t": CLAIMS})

    assert await verifier.verify("t") is CLAIMS
    with pytest.raises(InvalidTokenError):
        await verifier.verify("other")


async def test_admin_records_deletes_idempotently() -> None:
    admin = FakeAuthAdmin()
    port: AuthAdmin = admin
    user: UUID = uuid4()

    await port.delete_user(user)
    await port.delete_user(user)

    assert admin.deleted == [user, user]


async def test_admin_fail_next_raises_once() -> None:
    admin = FakeAuthAdmin()
    admin.fail_next()

    with pytest.raises(AuthAdminError):
        await admin.delete_user(uuid4())
    await admin.delete_user(uuid4())
    assert len(admin.deleted) == 1
