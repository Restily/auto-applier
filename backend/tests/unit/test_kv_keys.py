"""Unit tests for `kv.keys` (Redis key namespacing) and the pure `heartbeat_age_s` helper.

`heartbeat_age_s` lives in `kv.heartbeat` but takes no Redis client, so it is
tested here alongside `key()` rather than in the integration suite.
"""

from datetime import UTC, datetime, timedelta

import pytest

from autoapplier.kv.heartbeat import Heartbeat, heartbeat_age_s
from autoapplier.kv.keys import HEARTBEAT_WORKER, key


def test_key_joins_parts() -> None:
    assert key("aa:", "heartbeat", "worker") == "aa:heartbeat:worker"
    assert key("aa:", *HEARTBEAT_WORKER) == "aa:heartbeat:worker"


def test_prefix_without_colon_rejected() -> None:
    with pytest.raises(ValueError, match="must end with"):
        key("aa", "heartbeat")


def test_heartbeat_age_none_when_missing() -> None:
    assert heartbeat_age_s(None, datetime.now(UTC)) is None


def test_heartbeat_age_seconds() -> None:
    now = datetime.now(UTC)
    heartbeat = Heartbeat(worker="worker-1", version="0.1.0", at=now - timedelta(seconds=5))

    assert heartbeat_age_s(heartbeat, now) == pytest.approx(5.0)
