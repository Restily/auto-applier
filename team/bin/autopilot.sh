#!/usr/bin/env bash
# autopilot.sh — run the MVP autopilot headless via the built-in /goal (no interactive UI).
#
#   bash team/bin/autopilot.sh [--turns 200] [--mode auto|bypassPermissions] [--one-session]
#
# One fresh Claude session per milestone (state lives in files; the SessionStart hook restores it),
# so the lead's context never grows across the whole MVP. --one-session keeps the old single-session run.
# Prerequisites: kickoff done and docs/product/AUTONOMY.md approved (board.py next-step must not need a human).
# Stop: Ctrl+C, or `touch .team/STOP` (the lead stops at the next safe point).
# bypassPermissions only inside a container/VM you can throw away.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TURNS="${TEAM_GOAL_TURNS:-200}"
MODE="auto"
ONE_SESSION=0
MAX_SESSIONS="${TEAM_AUTOPILOT_MAX_SESSIONS:-40}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --turns) TURNS="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --one-session) ONE_SESSION=1; shift ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
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
STAMP="$(date +%Y%m%d-%H%M%S)"

# run_session <prompt> <log>: one headless Claude session, streamed to a log with a short live summary.
run_session() {
  claude -p "$1" --permission-mode "$MODE" --output-format stream-json --verbose | tee "$2" | python3 -u -c '
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
}

if [[ $ONE_SESSION -eq 1 ]]; then
  LOG=".team/state/autopilot-$STAMP.jsonl"
  echo "▶ autopilot (one session): mode=$MODE turns≤$TURNS log=$LOG"
  run_session "$(python3 team/bin/board.py goal --turns "$TURNS")" "$LOG"
  python3 team/bin/board.py status
  exit 0
fi

echo "▶ autopilot (session per milestone): mode=$MODE turns≤$TURNS/session logs=.team/state/autopilot-$STAMP-*.jsonl"
prev="" same=0 n=0
while :; do
  ns="$(python3 team/bin/board.py next-step --json)"
  read -r step human mid phase < <(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["step"], int(d["human"]), d.get("milestone","-"), d.get("phase","-"))' <<<"$ns")
  if [[ "$human" == "1" ]]; then
    python3 team/bin/board.py next-step
    echo "■ a human is needed (see above)"
    break
  fi
  n=$((n + 1))
  if (( n > MAX_SESSIONS )); then
    echo "■ stopped after $MAX_SESSIONS sessions (TEAM_AUTOPILOT_MAX_SESSIONS)"
    break
  fi
  if [[ "$step" == "DONE" ]]; then
    # The full-MVP goal sees DONE at once: the lead writes the final report (/mvp-release §4) and stops.
    run_session "$(python3 team/bin/board.py goal --turns "$TURNS")" ".team/state/autopilot-$STAMP-final.jsonl" \
      || echo "! final session exited with an error"
    break
  fi
  # A session can die mid-phase (usage limit, crash) and the next one resumes it; three sessions in a row
  # without any phase change means the run is stuck.
  if [[ "$mid:$phase" == "$prev" ]]; then same=$((same + 1)); else same=0; prev="$mid:$phase"; fi
  if (( same >= 3 )); then
    echo "■ no progress on $mid (phase $phase) after 3 sessions — stopping; see the logs"
    break
  fi
  echo "▶ session $n: $mid (phase $phase)"
  run_session "$(python3 team/bin/board.py goal --milestone "$mid" --turns "$TURNS")" \
    ".team/state/autopilot-$STAMP-$n-$mid.jsonl" || echo "! session $n exited with an error"
done
python3 team/bin/board.py status
