"""JSON-lines logging with key-based redaction of secrets."""

import json
import logging
import re
import sys
from typing import Any

from autoapplier.config import Settings

REDACTED = "[redacted]"
_HANDLER_NAME = "autoapplier-json"
_SENSITIVE = re.compile(r"(?i)(password|secret|token|authorization|api_?key|cookie)")
_STANDARD = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime", "taskName"}


def _redact(value: Any, key: str | None = None) -> Any:
    if key is not None and _SENSITIVE.search(key):
        return REDACTED
    if isinstance(value, dict):
        return {k: _redact(v, str(k)) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact(v) for v in value]
    return value


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD:
                payload[key] = _redact(value, key)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(settings: Settings) -> None:
    """Install one JSON stderr handler on the root logger (idempotent)."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(_JsonFormatter())
    handler.set_name(_HANDLER_NAME)
    root = logging.getLogger()
    root.handlers[:] = [h for h in root.handlers if h.get_name() != _HANDLER_NAME] + [handler]
    root.setLevel(logging.INFO)
