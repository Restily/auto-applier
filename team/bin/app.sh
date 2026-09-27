#!/usr/bin/env bash
# app.sh — the one way to run the app for QA, designer and security (one process, known URL).
# Agents never start dev servers on their own.
#
#   bash team/bin/app.sh start     # local Supabase (if used) + dev server in background, waits until ready
#   bash team/bin/app.sh stop      # stop the dev server (leaves Supabase running)
#   bash team/bin/app.sh restart
#   bash team/bin/app.sh status    # app + Supabase state and URL
#   bash team/bin/app.sh url       # print the app URL
#   bash team/bin/app.sh logs [N]  # tail the dev server log
#   bash team/bin/app.sh supabase  # only ensure local Supabase is up (idempotent)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="$ROOT/.team/state"
PIDFILE="$STATE/app.pid"
LOG="$STATE/app.log"
mkdir -p "$STATE"
PM="" APP_START_CMD="" APP_URL="http://localhost:3000" APP_READY_PATH="/" APP_START_TIMEOUT=120 USE_SUPABASE="auto" SUPABASE_START_ARGS=""
# shellcheck source=../config.sh
[[ -f "$ROOT/team/config.sh" ]] && source "$ROOT/team/config.sh"
cd "$ROOT" || exit 1

supabase_bin() { if command -v supabase >/dev/null 2>&1; then echo "supabase"; else echo "npx -y supabase"; fi; }

need_supabase() {
  case "$USE_SUPABASE" in
    yes) return 0 ;;
    no) return 1 ;;
    *) [[ -f "$ROOT/supabase/config.toml" ]] ;;
  esac
}

ensure_docker() {
  docker info >/dev/null 2>&1 && return 0
  if [[ "${CLAUDE_CODE_REMOTE:-}" == "true" ]]; then  # cloud VM: Docker is installed but not started
    echo "▶ starting dockerd (cloud VM)…"
    service docker start >/dev/null 2>&1 || (nohup dockerd >"$STATE/dockerd.log" 2>&1 </dev/null &)
    local i; for i in $(seq 1 30); do docker info >/dev/null 2>&1 && return 0; sleep 1; done
  fi
  echo "✗ Docker is not running (docker info failed)" >&2; return 1
}

ensure_supabase() {
  need_supabase || return 0
  local sb; sb="$(supabase_bin)"
  $sb status >/dev/null 2>&1 && return 0
  ensure_docker || return 1
  echo "▶ supabase start ${SUPABASE_START_ARGS}…"
  # shellcheck disable=SC2086
  $sb start $SUPABASE_START_ARGS || { echo "✗ could not start local Supabase (see output above)" >&2; return 1; }
}

start_cmd() {
  if [[ -n "$APP_START_CMD" ]]; then echo "$APP_START_CMD"; return; fi
  [[ -f package.json ]] || return 0
  local pm="$PM"
  if [[ -z "$pm" ]]; then
    if [[ -f pnpm-lock.yaml ]]; then pm=pnpm; elif [[ -f yarn.lock ]]; then pm=yarn
    elif [[ -f bun.lockb || -f bun.lock ]]; then pm=bun; else pm=npm; fi
  fi
  echo "$pm run dev"
}

is_running() { [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

responds() {
  local url="${APP_URL%/}${APP_READY_PATH}"
  if command -v curl >/dev/null 2>&1; then
    local code; code=$(curl -s -o /dev/null -m 5 -w "%{http_code}" "$url" || true)
    [[ "$code" =~ ^[23] ]]
  else
    python3 - "$url" <<'PY' >/dev/null 2>&1
import sys, urllib.request, urllib.error
try:
    urllib.request.urlopen(sys.argv[1], timeout=5)
except urllib.error.HTTPError as e:
    sys.exit(0 if e.code < 400 else 1)
except Exception:
    sys.exit(1)
PY
  fi
}

do_start() {
  ensure_supabase || exit 1
  if is_running && responds; then echo "✓ already running: $APP_URL"; return 0; fi
  is_running && do_stop >/dev/null
  local cmd; cmd="$(start_cmd)"
  [[ -n "$cmd" ]] || { echo "✗ don't know how to start the app: set APP_START_CMD in team/config.sh" >&2; exit 1; }
  echo "▶ $cmd  (log: .team/state/app.log)"
  set -m  # own process group so stop also kills child processes
  nohup bash -c "exec $cmd" >"$LOG" 2>&1 </dev/null &
  echo $! >"$PIDFILE"
  set +m
  local waited=0
  until responds; do
    if ! is_running; then echo "✗ process exited. Log tail:" >&2; tail -n 40 "$LOG" >&2; exit 1; fi
    if (( waited >= APP_START_TIMEOUT )); then echo "✗ $APP_URL not ready after ${APP_START_TIMEOUT}s" >&2; tail -n 40 "$LOG" >&2; exit 1; fi
    sleep 2; waited=$((waited + 2))
  done
  echo "✓ app ready: $APP_URL"
}

do_stop() {
  if is_running; then
    local pid; pid="$(cat "$PIDFILE")"
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
    sleep 1
    kill -KILL -- "-$pid" 2>/dev/null || true
    echo "✓ stopped (pid $pid)"
  else
    echo "= not running"
  fi
  rm -f "$PIDFILE"
}

case "${1:-status}" in
  start) do_start ;;
  stop) do_stop ;;
  restart) do_stop; do_start ;;
  url) echo "$APP_URL" ;;
  logs) tail -n "${2:-80}" "$LOG" 2>/dev/null || echo "(no log)" ;;
  supabase) ensure_supabase && { need_supabase && echo "✓ supabase: running" || echo "= supabase: not used"; } ;;
  status)
    if is_running && responds; then echo "app: RUNNING $APP_URL (pid $(cat "$PIDFILE"))"
    elif is_running; then echo "app: STARTING/UNHEALTHY (pid $(cat "$PIDFILE")) — bash team/bin/app.sh logs"
    else echo "app: STOPPED"; fi
    if need_supabase; then
      if $(supabase_bin) status >/dev/null 2>&1; then echo "supabase: RUNNING (MCP http://127.0.0.1:54321/mcp)"; else echo "supabase: STOPPED"; fi
    fi
    ;;
  *) sed -n '2,12p' "$0"; exit 64 ;;
esac
