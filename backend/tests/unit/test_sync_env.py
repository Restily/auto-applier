"""Unit tests for scripts/sync_env.py.

The module lives outside the backend package (it also targets apps/web's env
file), so it is loaded from disk rather than imported normally.
"""

import importlib.util
from collections.abc import Mapping
from pathlib import Path
from typing import Protocol, cast

_MODULE_PATH = Path(__file__).parents[3] / "scripts" / "sync_env.py"


class _SyncEnvModule(Protocol):
    """The subset of scripts/sync_env.py this test exercises."""

    def parse_env(self, text: str) -> dict[str, str]: ...

    def resolve_values(
        self,
        example: Mapping[str, str],
        existing: Mapping[str, str],
        supabase: Mapping[str, str],
    ) -> dict[str, str]: ...

    def render_env(self, example_text: str, values: Mapping[str, str]) -> str: ...

    def sync(self, root: Path, supabase: Mapping[str, str]) -> list[Path]: ...


def _load_sync_env() -> _SyncEnvModule:
    spec = importlib.util.spec_from_file_location("sync_env", _MODULE_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return cast(_SyncEnvModule, module)


sync_env = _load_sync_env()


def test_parse_env_handles_quotes_comments_blank_lines_and_export() -> None:
    text = (
        "# a leading comment\n"
        "\n"
        "APP_ENV=local\n"
        'QUOTED="hello world"\n'
        "\n"
        "export DATABASE_URL=postgresql://x\n"
        "# trailing comment\n"
    )

    result = sync_env.parse_env(text)

    assert result == {
        "APP_ENV": "local",
        "QUOTED": "hello world",
        "DATABASE_URL": "postgresql://x",
    }


def test_supabase_values_override_example_and_existing() -> None:
    example = {"DATABASE_URL": ""}
    existing = {"DATABASE_URL": "postgresql://old"}
    supabase = {"DB_URL": "postgresql://new"}

    values = sync_env.resolve_values(example, existing, supabase)

    assert values["DATABASE_URL"] == "postgresql://new"


def test_existing_custom_value_is_preserved() -> None:
    example = {"LLM_PROVIDER": "fake"}
    existing = {"LLM_PROVIDER": "anthropic"}

    values = sync_env.resolve_values(example, existing, supabase={})

    assert values["LLM_PROVIDER"] == "anthropic"


def test_example_default_used_when_no_other_value() -> None:
    example = {"REDIS_URL": "redis://127.0.0.1:6379/0"}

    values = sync_env.resolve_values(example, existing={}, supabase={})

    assert values["REDIS_URL"] == "redis://127.0.0.1:6379/0"


def test_publishable_key_preferred_then_anon_fallback() -> None:
    example = {"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": ""}

    both_present = sync_env.resolve_values(
        example,
        existing={},
        supabase={"PUBLISHABLE_KEY": "pub-123", "ANON_KEY": "anon-456"},
    )
    fallback_only = sync_env.resolve_values(example, existing={}, supabase={"ANON_KEY": "anon-456"})

    assert both_present["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] == "pub-123"
    assert fallback_only["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] == "anon-456"


def test_target_skipped_when_example_missing(tmp_path: Path) -> None:
    (tmp_path / "backend").mkdir()
    (tmp_path / "backend" / ".env.example").write_text("APP_ENV=local\n")

    written = sync_env.sync(tmp_path, supabase={})

    assert written == [tmp_path / "backend" / ".env"]
    assert (tmp_path / "backend" / ".env").exists()
    assert not (tmp_path / "apps" / "web" / ".env.local").exists()


def test_sync_is_idempotent(tmp_path: Path) -> None:
    (tmp_path / "backend").mkdir()
    (tmp_path / "backend" / ".env.example").write_text(
        "# example\nAPP_ENV=local\nDATABASE_URL=\nREDIS_URL=redis://127.0.0.1:6379/0\n"
    )
    supabase = {"DB_URL": "postgresql://generated"}

    sync_env.sync(tmp_path, supabase)
    first = (tmp_path / "backend" / ".env").read_bytes()
    sync_env.sync(tmp_path, supabase)
    second = (tmp_path / "backend" / ".env").read_bytes()

    assert first == second


def test_only_example_keys_are_written() -> None:
    example = {"APP_ENV": "local"}
    supabase = {"SOME_RANDOM_KEY": "value", "DB_URL": "postgresql://x"}

    values = sync_env.resolve_values(example, existing={}, supabase=supabase)

    assert values == {"APP_ENV": "local"}
