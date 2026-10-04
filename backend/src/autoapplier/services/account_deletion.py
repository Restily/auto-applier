"""Account deletion: purge non-Postgres data, then delete the Auth user (cascades the rest).

D5: the email fingerprint is written by the `auth.users` delete trigger in the same
transaction as the delete, so nothing here touches it. A failure before the Auth delete
leaves the account intact and retryable; purge steps may already have removed some data by
then (they are idempotent). After a successful Auth delete the steps run once more, so a
file uploaded while the deletion was in flight does not stay orphaned.
"""

import logging
from collections.abc import Sequence
from typing import Final
from uuid import UUID

from autoapplier.domain.account import emails_match
from autoapplier.ports.account import AccountPurgeStep
from autoapplier.ports.auth import AuthAdmin, AuthClaims
from autoapplier.ports.storage import FileStorage
from autoapplier.services.resumes import RESUME_BUCKET

_log = logging.getLogger(__name__)
_MAX_PURGE_PASSES: Final = 100


class ConfirmationMismatch(Exception):
    """The typed email does not match the account email."""


class AccountDeletionFailed(Exception):
    """A purge step or the Auth delete failed; the account still exists and it can be retried.

    Earlier purge steps (and the failed one, partly) may already have removed data.
    """


class ResumeFilesPurge:
    """Removes every object under `resumes/<user_id>/`."""

    name = "resume_files"

    def __init__(self, storage: FileStorage) -> None:
        self._storage = storage

    async def purge(self, user_id: UUID) -> None:
        for _ in range(_MAX_PURGE_PASSES):
            paths = await self._storage.list_paths(bucket=RESUME_BUCKET, prefix=str(user_id))
            if not paths:
                return
            await self._storage.remove(bucket=RESUME_BUCKET, paths=paths)
        raise RuntimeError("resume files remain after repeated purge passes")


class AccountDeletionService:
    def __init__(self, auth_admin: AuthAdmin, steps: Sequence[AccountPurgeStep]) -> None:
        self._auth_admin = auth_admin
        self._steps = steps

    async def delete(self, claims: AuthClaims, *, confirm_email: str) -> None:
        if not emails_match(confirm_email, claims.email):
            raise ConfirmationMismatch
        for step in self._steps:
            try:
                await step.purge(claims.user_id)
            except Exception as exc:
                _log.error("account purge step failed: %s (%s)", step.name, type(exc).__name__)
                raise AccountDeletionFailed(step.name) from exc
        try:
            await self._auth_admin.delete_user(claims.user_id)
        except Exception as exc:
            _log.error("account auth delete failed (%s)", type(exc).__name__)
            raise AccountDeletionFailed("auth_delete") from exc

        # Sweep again now that the user is gone: nothing can be added for them any more, so
        # this catches objects uploaded mid-deletion. The account is already deleted, so a
        # failure here is logged (type only) and does not turn the deletion into an error.
        for step in self._steps:
            try:
                await step.purge(claims.user_id)
            except Exception as exc:
                _log.error(
                    "account post-delete purge failed: %s (%s)", step.name, type(exc).__name__
                )
