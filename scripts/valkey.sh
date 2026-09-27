#!/usr/bin/env bash
# scripts/valkey.sh — local Valkey (Redis-protocol, BSD-3) container: Celery broker + result
# backend and app keys (ADR-0012). No persistence, never flushes data.
#
#   bash scripts/valkey.sh start   # idempotent: create it, or start it if stopped; waits for PING
#   bash scripts/valkey.sh stop    # stop the container, keep it (no docker rm)
#   bash scripts/valkey.sh status  # prints: valkey: RUNNING|STOPPED|ABSENT
set -uo pipefail

IMAGE="${VALKEY_IMAGE:-valkey/valkey:8.1-alpine}"
CONTAINER="autoapplier-valkey"
PUBLISH="127.0.0.1:6379:6379"
WAIT_TIMEOUT_S=20

ensure_docker() {
  docker info >/dev/null 2>&1 && return 0
  echo "✗ Docker is not running: run bash team/bin/app.sh supabase first" >&2
  return 1
}

# Prints "true" (running), "false" (exists, stopped) or "" (absent / docker unreachable).
container_state() {
  docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null
}

wait_for_ping() {
  local waited=0
  while (( waited < WAIT_TIMEOUT_S )); do
    [[ "$(docker exec "$CONTAINER" valkey-cli ping 2>/dev/null)" == "PONG" ]] && return 0
    sleep 1
    waited=$((waited + 1))
  done
  echo "✗ $CONTAINER did not answer PING within ${WAIT_TIMEOUT_S}s" >&2
  return 1
}

do_start() {
  ensure_docker || exit 1
  case "$(container_state)" in
    true)
      echo "= valkey: already running"
      exit 0
      ;;
    false)
      docker start "$CONTAINER" >/dev/null
      ;;
    *)
      docker run -d --name "$CONTAINER" --restart unless-stopped -p "$PUBLISH" "$IMAGE" \
        valkey-server --save "" --appendonly no >/dev/null
      ;;
  esac
  wait_for_ping || exit 1
  echo "✓ valkey: running ($CONTAINER, 127.0.0.1:6379)"
}

do_stop() {
  if [[ "$(container_state)" == "true" ]]; then
    docker stop "$CONTAINER" >/dev/null
    echo "✓ valkey: stopped"
  else
    echo "= valkey: not running"
  fi
}

do_status() {
  case "$(container_state)" in
    true) echo "valkey: RUNNING" ;;
    false) echo "valkey: STOPPED" ;;
    *) echo "valkey: ABSENT" ;;
  esac
}

case "${1:-status}" in
  start) do_start ;;
  stop) do_stop ;;
  status) do_status ;;
  *) sed -n '2,8p' "$0"; exit 64 ;;
esac
