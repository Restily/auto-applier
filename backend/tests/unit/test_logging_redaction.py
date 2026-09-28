"""Unit tests for JSON logging with key-based redaction."""

import json
import logging

import pytest

from autoapplier.config import Settings
from autoapplier.logging import configure_logging


def _log(capsys: pytest.CaptureFixture[str], **extra: object) -> dict[str, object]:
    configure_logging(Settings(_env_file=None))
    logging.getLogger("autoapplier.test").warning("hello", extra=extra)
    line = capsys.readouterr().err.strip().splitlines()[-1]
    return json.loads(line)  # type: ignore[no-any-return]


def test_authorization_and_password_values_redacted(capsys: pytest.CaptureFixture[str]) -> None:
    record = _log(
        capsys,
        Authorization="Bearer abc",
        password="hunter2",  # noqa: S106
        access_token="tok",  # noqa: S106
        api_key="k",
        Cookie="c",
        client_secret="s",  # noqa: S106
    )

    for key in ("Authorization", "password", "access_token", "api_key", "Cookie", "client_secret"):
        assert record[key] == "[redacted]"


def test_other_fields_kept(capsys: pytest.CaptureFixture[str]) -> None:
    record = _log(capsys, user_id="u1", status=200)

    assert record["message"] == "hello"
    assert record["level"] == "WARNING"
    assert record["user_id"] == "u1"
    assert record["status"] == 200


def test_nested_values_redacted(capsys: pytest.CaptureFixture[str]) -> None:
    record = _log(capsys, headers={"authorization": "Bearer abc", "accept": "x"})

    assert record["headers"] == {"authorization": "[redacted]", "accept": "x"}


def test_configure_twice_does_not_duplicate_handlers() -> None:
    configure_logging(Settings(_env_file=None))
    configure_logging(Settings(_env_file=None))

    assert len(logging.getLogger().handlers) == 1
