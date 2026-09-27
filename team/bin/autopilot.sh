#!/usr/bin/env bash
# autopilot.sh — run the MVP autopilot headless via the built-in /goal (no interactive UI).
#
#   bash team/bin/autopilot.sh [--turns 200] [--mode auto|bypassPermissions]
#
# Prerequisites: kickoff done and docs/product/AUTONOMY.md approved (board.py next-step must not need a human).
# Stop: Ctrl+C, or `touch .team/STOP` (the lead stops at the next safe point).
# bypassPermissions only inside a container/VM you can throw away.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TURNS="${TEAM_GOAL_TURNS:-200}"
MODE="auto"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --turns) TURNS="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done
cd "$ROOT"
command -v claude >/dev/null || { echo "✗ claude CLI not found" >&2; exit 1; }

if ! python3 team/bin/board.py next-step --json | python3 -c 'import json,sys; sys.exit(1 if json.load(sys.stdin)["human"] else 0)'; then
  python3 team/bin/board.py next-step
  echo "✗ a human step is required first (see above)" >&2
  exit 1
fi
if [[ "$MODE" == "bypassPermissions" && ! -f /.dockerenv && -z "${container:-}" ]]; then
  echo "! bypassPermissions outside a container — press Ctrl+C within 5s to abort" >&2; sleep 5
fi

mkdir -p .team/state
LOG=".team/state/autopilot-$(date +%Y%m%d-%H%M%S).jsonl"
GOAL="$(python3 team/bin/board.py goal --turns "$TURNS")"
echo "▶ autopilot: mode=$MODE turns≤$TURNS log=$LOG"

claude -p "$GOAL" --permission-mode "$MODE" --output-format stream-json --verbose | tee "$LOG" | python3 -u -c '
import json, sys
for line in sys.stdin:
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("type") == "assistant":
        for block in ev.get("message", {}).get("content", []):
            if block.get("type") == "text" and block.get("text", "").strip():
                print("•", block["text"].strip().splitlines()[0][:160], flush=True)
    elif ev.get("type") == "result":
        print("■ result:", str(ev.get("result", ""))[:2000], flush=True)
'
python3 team/bin/board.py status
