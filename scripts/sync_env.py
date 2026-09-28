#!/usr/bin/env python3
"""Sync backend/.env and apps/web/.env.local from their .env.example templates.

Value precedence per key (highest first):
  1. A value from `bash scripts/supabase.sh status -o env`, if the key is mapped
     to a Supabase status key in SUPABASE_MAP and that key is present.
  2. The value already in the target file, if the target exists and has the key.
  3. The default from the .env.example template.

Only keys listed in the .env.example template are ever written; a target whose
example does not exist is skipped. Target files are git-ignored (`.env`,
`.env.local`) — this script is how a developer (or `npm run dev`) gets them
populated from local Supabase without committing secrets.

stdlib only: this script has no dependency on the backend's virtualenv, so it
can run before `uv sync` (or from a plain `python3`).
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path

# (example, target), both relative to the repo root.
TARGETS: tuple[tuple[str, str], ...] = (
    ("backend/.env.example", "backend/.env"),
    ("apps/web/.env.example", "apps/web/.env.local"),
)

# Key in the target file -> candidate keys in `supabase status -o env`, first
# candidate present in that output wins.
SUPABASE_MAP: dict[str, tuple[str, ...]] = {
    "DATABASE_URL": ("DB_URL",),
    "SUPABASE_URL": ("API_URL",),
    "SUPABASE_SECRET_KEY": ("SECRET_KEY", "SERVICE_ROLE_KEY"),
    "SUPABASE_JWT_SECRET": ("JWT_SECRET",),
    "NEXT_PUBLIC_SUPABASE_URL": ("API_URL",),
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": ("PUBLISHABLE_KEY", "ANON_KEY"),
}

_EXPORT_PREFIX = "export "


def parse_env(text: str) -> dict[str, str]:
    """Parse a dotenv-style file: `KEY=value`, `KEY="value"`, comments, blanks.

    Comment (`#...`) and blank lines are skipped. A leading `export ` on a line
    is stripped before parsing. A value wrapped in a single matching pair of
    double or single quotes has the quotes removed; nothing else is unescaped.
    """
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(_EXPORT_PREFIX):
            line = line[len(_EXPORT_PREFIX) :].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value
    return values


def resolve_values(
    example: Mapping[str, str],
    existing: Mapping[str, str],
    supabase: Mapping[str, str],
) -> dict[str, str]:
    """Resolve the final value for every key in `example` (and only those keys)."""
    resolved: dict[str, str] = {}
    for key, default in example.items():
        value = None
        for candidate in SUPABASE_MAP.get(key, ()):
            if candidate in supabase:
                value = supabase[candidate]
                break
        if value is None and key in existing:
            value = existing[key]
        if value is None:
            value = default
        resolved[key] = value
    return resolved


def render_env(example_text: str, values: Mapping[str, str]) -> str:
    """Re-render the example file's text with each key's value from `values`.

    Comments, blank lines and overall line order are kept exactly as in the
    example; only the value half of a recognized `KEY=...` line changes.
    """
    lines = example_text.splitlines()
    out_lines: list[str] = []
    for line in lines:
        content = line.lstrip()
        leading_ws = line[: len(line) - len(content)]
        prefix = ""
        if content.startswith(_EXPORT_PREFIX):
            prefix = _EXPORT_PREFIX
            content = content[len(_EXPORT_PREFIX) :]
        if not content or content.startswith("#") or "=" not in content:
            out_lines.append(line)
            continue
        key = content.split("=", 1)[0].strip()
        if key not in values:
            out_lines.append(line)
            continue
        out_lines.append(f"{leading_ws}{prefix}{key}={values[key]}")
    rendered = "\n".join(out_lines)
    if example_text.endswith("\n"):
        rendered += "\n"
    return rendered


def sync(root: Path, supabase: Mapping[str, str]) -> list[Path]:
    """Write every target in TARGETS whose .env.example exists under `root`."""
    written: list[Path] = []
    for example_rel, target_rel in TARGETS:
        example_path = root / example_rel
        if not example_path.is_file():
            continue
        target_path = root / target_rel
        example_text = example_path.read_text()
        example_values = parse_env(example_text)
        existing_values = parse_env(target_path.read_text()) if target_path.is_file() else {}
        values = resolve_values(example_values, existing_values, supabase)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(render_env(example_text, values))
        written.append(target_path)
    return written


def read_supabase_status(root: Path) -> dict[str, str]:
    """Run `bash scripts/supabase.sh status -o env` and parse its stdout.

    On any failure (Supabase not running, script missing, CLI error) this
    prints a warning to stderr and returns {} — sync() then falls back to
    existing/example values, and the caller's exit code stays 0.
    """
    script = root / "scripts" / "supabase.sh"
    bash = shutil.which("bash") or "bash"
    try:
        result = subprocess.run(  # noqa: S603
            [bash, str(script), "status", "-o", "env"],
            cwd=root,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        detail = exc.stderr.strip() if isinstance(exc, subprocess.CalledProcessError) else str(exc)
        print(
            f"warning: could not read supabase status ({detail}); keeping existing values",
            file=sys.stderr,
        )
        return {}
    return parse_env(result.stdout)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="repo root containing the .env.example templates (default: repo root)",
    )
    parser.add_argument(
        "--supabase-env-file",
        type=Path,
        default=None,
        help=(
            "read supabase values from this file (dotenv format) instead of running "
            "`scripts/supabase.sh status -o env`"
        ),
    )
    args = parser.parse_args(argv)
    root: Path = args.root.resolve()

    if args.supabase_env_file is not None:
        supabase = parse_env(Path(args.supabase_env_file).read_text())
    else:
        supabase = read_supabase_status(root)

    written = sync(root, supabase)
    for path in written:
        print(f"wrote {path.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
