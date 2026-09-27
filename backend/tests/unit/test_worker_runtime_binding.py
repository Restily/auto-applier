"""Unit tests for the worker's `AsyncRuntime` binding (Task 6, ADR-0012 option II).

Only checks the binding is wired up (an `AsyncRuntime` exists, shutdown signals are
connected to a receiver from this package) — `AsyncRuntime` itself is covered by
`test_async_runtime.py` and needs no real container here.
"""

import weakref

from celery.signals import worker_process_shutdown

from autoapplier.worker.celery_app import runtime
from autoapplier.worker.runtime import AsyncRuntime


def test_runtime_is_an_async_runtime() -> None:
    assert isinstance(runtime, AsyncRuntime)


def test_worker_process_shutdown_has_a_receiver_from_worker_package() -> None:
    modules = []
    for _lookup_key, receiver in worker_process_shutdown.receivers:
        if isinstance(receiver, weakref.ReferenceType):
            receiver = receiver()
        if receiver is not None:
            modules.append(getattr(receiver, "__module__", ""))

    assert any(module.startswith("autoapplier.worker") for module in modules)
