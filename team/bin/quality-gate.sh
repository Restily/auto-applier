#!/usr/bin/env bash
# quality-gate.sh — one set of quality checks for humans, agents, hooks and CI.
#
#   bash team/bin/quality-gate.sh fast   # lint + typecheck + unit        (hooks, before handing in a task)
#   bash team/bin/quality-gate.sh full   # + integration + build + e2e    (milestone gate, CI)
#   bash team/bin/quality-gate.sh e2e    # e2e only
#   ... --hook                           # on failure exit 2 (Claude Code hooks), otherwise exit 1
#
# Commands come from team/config.sh, otherwise from package.json scripts.
# Working dir: $TEAM_GATE_DIR or the repo root. Full logs: .team/state/gate-<step>.log
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="fast"
HOOK=0
for arg in "$@"; do
  case "$arg" in
    fast|full|e2e) MODE="$arg" ;;
    --hook) HOOK=1 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 64 ;;
  esac
done

# In hook mode everything goes to stderr so the blocked agent sees it.
[[ $HOOK -eq 1 ]] && exec 1>&2

DIR="${TEAM_GATE_DIR:-$ROOT}"
STATE="$ROOT/.team/state"
mkdir -p "$STATE"
PM="" CHECK_LINT="" CHECK_TYPECHECK="" CHECK_UNIT="" CHECK_INTEGRATION="" CHECK_E2E="" CHECK_BUILD=""
# shellcheck source=../config.sh
[[ -f "$ROOT/team/config.sh" ]] && source "$ROOT/team/config.sh"
export CI=1 FORCE_COLOR=0 NO_COLOR=1

detect_pm() {
  if [[ -n "$PM" ]]; then echo "$PM"; return; fi
  if [[ -f "$DIR/pnpm-lock.yaml" ]]; then echo pnpm
  elif [[ -f "$DIR/yarn.lock" ]]; then echo yarn
  elif [[ -f "$DIR/bun.lockb" || -f "$DIR/bun.lock" ]]; then echo bun
  else echo npm; fi
}

has_script() {
  [[ -f "$DIR/package.json" ]] || return 1
  python3 - "$DIR/package.json" "$1" <<'PY' 2>/dev/null
import json, sys
scripts = json.load(open(sys.argv[1])).get("scripts", {})
sys.exit(0 if sys.argv[2] in scripts else 1)
PY
}

script_cmd() {
  local pm; pm="$(detect_pm)"
  case "$pm" in
    npm) echo "npm run --silent $1" ;;
    yarn) echo "yarn run $1" ;;
    *) echo "$pm run --silent $1" ;;
  esac
}

resolve() { # resolve <explicit command> <script1> [script2...]
  local explicit="$1"; shift
  if [[ -n "$explicit" ]]; then echo "$explicit"; return; fi
  local s
  for s in "$@"; do
    if has_script "$s"; then script_cmd "$s"; return; fi
  done
}

declare -a NAMES=() CMDS=()
add() { [[ -n "$2" ]] && NAMES+=("$1") && CMDS+=("$2"); return 0; }

case "$MODE" in
  fast)
    add lint "$(resolve "$CHECK_LINT" lint)"
    add typecheck "$(resolve "$CHECK_TYPECHECK" typecheck type-check tsc)"
    add unit "$(resolve "$CHECK_UNIT" test:unit test)"
    ;;
  full)
    add lint "$(resolve "$CHECK_LINT" lint)"
    add typecheck "$(resolve "$CHECK_TYPECHECK" typecheck type-check tsc)"
    add unit "$(resolve "$CHECK_UNIT" test:unit test)"
    add integration "$(resolve "$CHECK_INTEGRATION" test:integration)"
    add build "$(resolve "$CHECK_BUILD" build)"
    add e2e "$(resolve "$CHECK_E2E" test:e2e e2e)"
    ;;
  e2e)
    add e2e "$(resolve "$CHECK_E2E" test:e2e e2e)"
    ;;
esac

if [[ ${#NAMES[@]} -eq 0 ]]; then
  echo "quality-gate ($MODE): no checks configured (no package.json scripts, empty team/config.sh) — skipped"
  exit 0
fi

# e2e usually needs local Supabase
if [[ " ${NAMES[*]} " == *" e2e "* ]]; then
  bash "$ROOT/team/bin/app.sh" supabase >/dev/null 2>&1 || true
fi

FAILED=()
for i in "${!NAMES[@]}"; do
  name="${NAMES[$i]}"; cmd="${CMDS[$i]}"; log="$STATE/gate-$name.log"
  start=$(date +%s)
  echo "▶ $name: $cmd"
  (cd "$DIR" && bash -c "$cmd") >"$log" 2>&1
  code=$?
  dur=$(( $(date +%s) - start ))
  if [[ $code -eq 0 ]]; then
    echo "  ✓ $name (${dur}s)"
  else
    echo "  ✗ $name (exit $code, ${dur}s) — log: ${log#"$ROOT/"}"
    tail -n 40 "$log" | sed 's/^/    │ /'
    FAILED+=("$name")
  fi
done

if [[ ${#FAILED[@]} -gt 0 ]]; then
  msg="quality-gate ($MODE): FAIL — ${FAILED[*]}. Fix the root cause (never weaken checks or delete tests) and rerun."
  if [[ $HOOK -eq 1 ]]; then echo "$msg" >&2; exit 2; fi
  echo "$msg"; exit 1
fi
echo "quality-gate ($MODE): PASS"
exit 0
