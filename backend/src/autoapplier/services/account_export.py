"""Account export: every row the caller owns, read as the caller so RLS scopes it (S-006)."""

import json
from collections.abc import Mapping
from datetime import datetime
from typing import Any, Final

import asyncpg

from autoapplier.db.as_user import as_user
from autoapplier.domain.account import (
    AccountExport,
    ExportAccount,
    ExportLedgerEntry,
    ExportResume,
)
from autoapplier.ports.auth import AuthClaims

# Export section -> table. A test requires every user-owned table to be here or in EXCLUDED.
EXPORT_SECTIONS: Final[Mapping[str, str]] = {
    "account": "profiles",
    "profile": "candidate_profiles",
    "resumes": "resumes",
    "credit_ledger": "credit_ledger",
}
EXPORT_EXCLUDED: Final[Mapping[str, str]] = {}  # table -> reason it is not exported


def _json(value: Any) -> Any:
    return json.loads(value) if isinstance(value, str) else value


class AccountExportService:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def export(self, claims: AuthClaims, *, now: datetime) -> AccountExport:
        async with as_user(self._pool, claims) as conn:
            account = await conn.fetchrow(
                "select id, ui_locale, created_at from public.profiles where id = $1",
                claims.user_id,
            )
            profile = await conn.fetchval(
                "select to_jsonb(p) - 'user_id' from public.candidate_profiles p "
                "where p.user_id = $1",
                claims.user_id,
            )
            resumes = await conn.fetch(
                "select id, file_name, mime_type, size_bytes, status, created_at, extracted "
                "from public.resumes where user_id = $1 order by created_at, id",
                claims.user_id,
            )
            ledger = await conn.fetch(
                "select delta, reason, created_at from public.credit_ledger "
                "where user_id = $1 order by created_at, id",
                claims.user_id,
            )
            balance = await conn.fetchval(
                "select balance from public.credit_balances where user_id = $1", claims.user_id
            )
        if account is None:
            raise LookupError("account has no profile row")
        return AccountExport(
            exported_at=now,
            account=ExportAccount(
                id=account["id"],
                email=claims.email,
                ui_locale=account["ui_locale"],
                created_at=account["created_at"],
            ),
            profile=_json(profile),
            resumes=[
                ExportResume(
                    id=r["id"],
                    file_name=r["file_name"],
                    mime_type=r["mime_type"],
                    size_bytes=r["size_bytes"],
                    status=r["status"],
                    created_at=r["created_at"],
                    extracted=_json(r["extracted"]),
                )
                for r in resumes
            ],
            searches=[],
            applications=[],
            credit_ledger=[
                ExportLedgerEntry(delta=e["delta"], reason=e["reason"], created_at=e["created_at"])
                for e in ledger
            ],
            credit_balance=int(balance or 0),
        )
