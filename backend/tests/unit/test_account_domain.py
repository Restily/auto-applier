"""Pure account helpers: email confirmation matching and the export file name."""

from datetime import UTC, datetime, timedelta, timezone

from autoapplier.domain.account import emails_match, export_filename


def test_emails_match_trims_and_ignores_case() -> None:
    assert emails_match("  Foo@Example.TEST ", "foo@example.test")


def test_emails_match_rejects_other() -> None:
    assert not emails_match("bar@example.test", "foo@example.test")
    assert not emails_match("", "foo@example.test")


def test_emails_match_none_is_false() -> None:
    assert not emails_match("foo@example.test", None)
    assert not emails_match("", None)


def test_export_filename_uses_utc_date() -> None:
    late_local = datetime(2026, 9, 29, 1, 30, tzinfo=timezone(timedelta(hours=5)))  # 28th UTC
    assert export_filename(late_local) == "autoapplier-export-2026-09-28.json"
    assert export_filename(datetime(2026, 1, 2, tzinfo=UTC)) == "autoapplier-export-2026-01-02.json"
