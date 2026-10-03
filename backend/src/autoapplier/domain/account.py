"""Account export shape and the deletion-confirmation rule (S-006)."""

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel


def emails_match(typed: str, account_email: str | None) -> bool:
    """True when the typed confirmation equals the account email (trimmed, case-insensitive)."""
    if account_email is None:
        return False
    return typed.strip().casefold() == account_email.strip().casefold()


def export_filename(now: datetime) -> str:
    """`autoapplier-export-<YYYY-MM-DD>.json`, dated in UTC."""
    return f"autoapplier-export-{now.astimezone(UTC).date().isoformat()}.json"


class ExportAccount(BaseModel):
    id: UUID
    email: str | None
    ui_locale: Literal["en", "ru"]
    created_at: datetime


class ExportResume(BaseModel):
    id: UUID
    file_name: str
    mime_type: str
    size_bytes: int
    status: str
    created_at: datetime
    extracted: dict[str, Any] | None


class ExportLedgerEntry(BaseModel):
    delta: int
    reason: str
    created_at: datetime


class AccountExport(BaseModel):
    format_version: Literal[1] = 1
    exported_at: datetime
    account: ExportAccount
    profile: dict[str, Any] | None
    resumes: list[ExportResume]
    searches: list[dict[str, Any]]
    applications: list[dict[str, Any]]
    credit_ledger: list[ExportLedgerEntry]
    credit_balance: int
