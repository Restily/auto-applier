"""Killable document parsing: the parser runs in a child process (T-028, M1 review N1).

pypdf/python-docx are pure Python and can spin forever on a crafted file. On a thread that
cannot be stopped, one such file would leak a CPU-bound thread per attempt and eventually
starve every extraction in the worker. A child process can be killed, so the deadline is
enforced for real: on timeout *or* when the awaiting task is cancelled (the service's
whole-attempt `asyncio.timeout`), the child is killed and reaped before this returns.
"""

import asyncio
import contextlib
import os
import sys
from collections.abc import Sequence
from typing import Final

from autoapplier.adapters.documents.child import EXIT_UNREADABLE
from autoapplier.domain.resume_files import DocumentKind
from autoapplier.ports.documents import DocumentParseTimeoutError, DocumentUnreadableError

# Below the service's 55 s whole-attempt deadline (< 60 s soft < 75 s hard Celery limit),
# leaving time for the download before and the LLM call after the parse.
PARSE_TIMEOUT_S: Final = 25.0
_PASSTHROUGH_ENV: Final = ("PATH", "PYTHONPATH", "VIRTUAL_ENV", "LANG", "LC_ALL")


class SubprocessDocumentExtractor:
    """`AsyncDocumentTextExtractor` that parses in a killed-on-deadline child interpreter."""

    def __init__(
        self,
        *,
        timeout_s: float = PARSE_TIMEOUT_S,
        argv: Sequence[str] | None = None,
    ) -> None:
        self._timeout_s = timeout_s
        # `argv` is a test seam (a child that hangs); production uses the real parser.
        self._argv = list(argv) if argv is not None else None

    async def extract_text(self, data: bytes, kind: DocumentKind) -> str:
        argv = self._argv or [sys.executable, "-m", "autoapplier.adapters.documents.child", kind]
        # The child parses untrusted bytes: it gets no secrets from our environment.
        env = {key: os.environ[key] for key in _PASSTHROUGH_ENV if key in os.environ}
        proc = await asyncio.create_subprocess_exec(
            *argv,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env=env,
        )
        try:
            try:
                async with asyncio.timeout(self._timeout_s):
                    stdout, _ = await proc.communicate(data)
            except TimeoutError as exc:
                raise DocumentParseTimeoutError(f"{kind} parse exceeded budget") from exc
        finally:
            await _kill_and_reap(proc)
        if proc.returncode == 0:
            return stdout.decode("utf-8", errors="replace")
        if proc.returncode == EXIT_UNREADABLE:
            raise DocumentUnreadableError(f"cannot read {kind}")
        raise DocumentUnreadableError(f"{kind} parser exited with code {proc.returncode}")


async def _kill_and_reap(proc: asyncio.subprocess.Process) -> None:
    """Make sure the child is gone and reaped, even if we are being cancelled."""
    if proc.returncode is None:
        with contextlib.suppress(ProcessLookupError):  # exited between the check and the kill
            proc.kill()
    await asyncio.shield(proc.wait())
