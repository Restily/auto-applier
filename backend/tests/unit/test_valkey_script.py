"""scripts/valkey.sh must fail fast when docker start/run/stop fails (stub docker, never real)."""

import os
import stat
import subprocess
import time
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "valkey.sh"

STUB = """#!/usr/bin/env bash
case "$1" in
  info) exit 0 ;;
  inspect) printf '%s' "${STUB_INSPECT:-}"; [[ -n "${STUB_INSPECT:-}" ]] || exit 1; exit 0 ;;
  run) exit "${STUB_RUN_RC:-0}" ;;
  start) exit "${STUB_START_RC:-0}" ;;
  stop) exit "${STUB_STOP_RC:-0}" ;;
  exec) printf 'PONG'; exit 0 ;;
esac
exit 0
"""


def _run(
    tmp_path: Path, sub: str, **stub_env: str
) -> tuple[subprocess.CompletedProcess[str], float]:
    docker = tmp_path / "docker"
    docker.write_text(STUB)
    docker.chmod(docker.stat().st_mode | stat.S_IEXEC)
    env = {**os.environ, "PATH": f"{tmp_path}:{os.environ['PATH']}", **stub_env}
    began = time.monotonic()
    proc = subprocess.run(  # noqa: S603
        ["bash", str(SCRIPT), sub],  # noqa: S607
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    return proc, time.monotonic() - began


def test_start_fails_fast_when_docker_run_fails(tmp_path: Path) -> None:
    proc, took = _run(tmp_path, "start", STUB_INSPECT="", STUB_RUN_RC="125")
    assert proc.returncode != 0
    assert took < 5
    assert "docker run" in proc.stderr


def test_start_fails_fast_when_docker_start_fails(tmp_path: Path) -> None:
    proc, took = _run(tmp_path, "start", STUB_INSPECT="false", STUB_START_RC="1")
    assert proc.returncode != 0
    assert took < 5
    assert "docker start" in proc.stderr


def test_stop_fails_when_docker_stop_fails(tmp_path: Path) -> None:
    proc, _ = _run(tmp_path, "stop", STUB_INSPECT="true", STUB_STOP_RC="1")
    assert proc.returncode != 0
    assert "docker stop" in proc.stderr


def test_start_succeeds_when_container_answers_ping(tmp_path: Path) -> None:
    proc, _ = _run(tmp_path, "start", STUB_INSPECT="false")
    assert proc.returncode == 0
    assert "✓ valkey: running" in proc.stdout
