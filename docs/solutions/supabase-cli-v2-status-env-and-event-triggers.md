# supabase-cli-v2-status-env-and-event-triggers

_2026-09-27 · Tags: supabase CLI 2.118.0, status -o env, stdout/stderr, agent output detection, create event trigger, RLS_

## Symptom
Two open questions going into M0 Task 2 (local Supabase, RLS-by-default): (1) how to parse
`supabase status -o env` programmatically for `scripts/sync_env.py`, and (2) whether
`create event trigger ... execute function ...` would even be accepted by the local stack (the
task brief said to report `BLOCKED` if not). Also, `supabase init` and `supabase migration new`
printed single-line JSON instead of the plain text shown in Supabase's own docs, which was
unexpected on a first run.

## Root cause
- `status -o env` writes `KEY="value"` — **always double-quoted**, one per line, sorted by key —
  to **stdout only**. Any incidental notice (e.g. `Stopped services: [supabase_studio_…]` when
  some services are excluded via `SUPABASE_START_ARGS`) goes to **stderr**, not mixed into
  stdout. A parser must strip one matching pair of quotes per value and must not read stderr as
  data.
- The CLI auto-detects a non-interactive/agent context (`--agent auto`, on by default) and
  switches several subcommands — observed for `init`, `migration new`, `start`, `db reset` — to
  print a single-line JSON summary instead of the interactive text. `status` without `-o` is
  unaffected in this environment, and `status -o env`'s output shape doesn't change either way.
  Don't grep these commands' stdout for the human-readable text from the docs; check the exit
  code, or pass an explicit `--output-format`/`-o` and parse that.
- `create event trigger` **is accepted**: the local stack's Postgres image
  (`public.ecr.aws/supabase/postgres:17.6.1.171`, pulled by CLI 2.118.0) is stock PostgreSQL 17
  with no restriction on event triggers (that's a managed-cloud-provider restriction in some
  services, not a local-Supabase one). Verified with `supabase db reset` applying a migration
  that creates `internal.enforce_rls()` (`SECURITY DEFINER`, `search_path = ''`) and
  `create event trigger enforce_rls on ddl_command_end when tag in (...) execute function
  internal.enforce_rls()`, then confirming `select evtname, evtenabled from pg_event_trigger`
  returns `enforce_rls | O`.

## Fix
- Parse `status -o env` with a small dotenv parser that strips a single matching leading/trailing
  `"`/`'` pair per value, and capture only stdout (`subprocess.run(..., capture_output=True)`,
  use `.stdout`, ignore `.stderr` as data — still fine to surface `.stderr` in a warning message
  on failure). See `scripts/sync_env.py`'s `parse_env()` / `read_supabase_status()`.
- Treat `create event trigger` as safe to use locally for the RLS-by-default pattern; no
  workaround needed.

## Prevention
Any later task that shells out to `supabase status -o env` (or reads `init`/`migration
new`/`start`/`db reset` stdout expecting the interactive text) should reuse
`scripts/sync_env.py`'s `parse_env()`/`read_supabase_status()` rather than re-deriving a parser,
and should verify with a real run first per the task's own "new CLI generation" guidance —
`--help` alone doesn't show the agent-mode output-shape switch.
