"""Redis/Valkey key namespacing: every key is `<prefix><colon-joined parts>`."""

from typing import Final


def key(prefix: str, *parts: str) -> str:
    """Join `parts` with ':' under `prefix`.

    Raises `ValueError` unless `prefix` ends with ':' — `Settings.redis_key_prefix`
    is validated the same way, so a bare "aa" instead of "aa:" fails loudly here
    too, instead of silently colliding two unrelated keys together.
    """
    if not prefix.endswith(":"):
        raise ValueError(f"prefix must end with ':': {prefix!r}")
    return prefix + ":".join(parts)


HEARTBEAT_WORKER: Final = ("heartbeat", "worker")
