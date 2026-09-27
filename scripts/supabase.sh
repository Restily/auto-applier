#!/usr/bin/env bash
# scripts/supabase.sh — Supabase CLI wrapper.
#
# Uses `supabase` from PATH when present (see docs/solutions/supabase-cli-in-cloud-vm.md
# for how the cloud VM gets it there), else falls back to `npx -y supabase`. All
# arguments are passed through unchanged.
#
#   bash scripts/supabase.sh init
#   bash scripts/supabase.sh migration new <name>
#   bash scripts/supabase.sh db reset
#   bash scripts/supabase.sh test db
#   bash scripts/supabase.sh status -o env
set -uo pipefail

if command -v supabase >/dev/null 2>&1; then
  exec supabase "$@"
else
  exec npx -y supabase "$@"
fi
