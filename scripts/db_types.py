#!/usr/bin/env python3
"""Generate apps/web/src/lib/supabase/database.types.ts from local Supabase.

Runs `bash scripts/supabase.sh gen types typescript --local --schema public`
against the running local stack (`bash team/bin/app.sh supabase`) and either
writes the result to disk or checks the file on disk is up to date with it.

  --write   Overwrite apps/web/src/lib/supabase/database.types.ts.
  --check   Exit 1 (with a hint) if the file on disk differs from what the
            local schema would generate right now; exit 0 if it matches.

Either mode exits 2 if type generation itself fails (most commonly because
local Supabase is not running).

stdlib only, like scripts/sync_env.py: no dependency on the backend's
virtualenv or the web workspace's node_modules.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUPABASE_SCRIPT = ROOT / "scripts" / "supabase.sh"
TARGET = ROOT / "apps" / "web" / "src" / "lib" / "supabase" / "database.types.ts"

NOT_RUNNING_MESSAGE = "Local Supabase is not running: bash team/bin/app.sh supabase"
DRIFT_MESSAGE = "DB types drift: run npm run gen:db-types"


class GenerationError(RuntimeError):
    """Raised when `supabase gen types` itself fails."""


def generate_types() -> str:
    """Run the Supabase CLI and return the generated TypeScript source.

    Raises GenerationError (wrapping the CLI's stderr) if the command exits
    non-zero or cannot be started at all (e.g. Docker/Supabase down).
    """
    try:
        result = subprocess.run(  # noqa: S603
            [
                "bash",
                str(SUPABASE_SCRIPT),
                "gen",
                "types",
                "typescript",
                "--local",
                "--schema",
                "public",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        raise GenerationError(str(exc)) from exc

    if result.returncode != 0:
        raise GenerationError(result.stderr.strip() or f"exit code {result.returncode}")

    # The CLI pads its stdout with a leading and trailing blank line; trim to
    # a clean file with a single trailing newline.
    return result.stdout.strip() + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="write the generated types to disk")
    mode.add_argument("--check", action="store_true", help="fail if the file on disk is stale")
    args = parser.parse_args(argv)

    try:
        generated = generate_types()
    except GenerationError as exc:
        print(NOT_RUNNING_MESSAGE, file=sys.stderr)
        print(f"({exc})", file=sys.stderr)
        return 2

    if args.write:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(generated)
        print(f"wrote {TARGET.relative_to(ROOT)}")
        return 0

    # --check
    current = TARGET.read_text() if TARGET.is_file() else None
    if current != generated:
        print(DRIFT_MESSAGE, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
