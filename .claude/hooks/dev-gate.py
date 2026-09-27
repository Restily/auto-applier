#!/usr/bin/env python3
"""SubagentStop(backend-dev|frontend-dev): a developer can't hand in work with red checks.

Runs `team/bin/quality-gate.sh fast --hook` (lint + typecheck + unit). Failure → exit 2: the subagent
keeps working and sees what broke. Loop protection: at most TEAM_DEV_GATE_RETRIES (default 2) bounces
per agent; superpowers statuses BLOCKED / NEEDS_CONTEXT pass without checks.
Disable: TEAM_DEV_GATE=off. Roles: TEAM_DEV_GATE_ROLES="backend-dev,frontend-dev".
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def main() -> None:
    if os.environ.get("TEAM_DEV_GATE", "on") == "off":
        sys.exit(0)
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)
    roles = {r.strip() for r in os.environ.get("TEAM_DEV_GATE_ROLES", "backend-dev,frontend-dev").split(",")}
    agent = data.get("agent_type") or ""
    if agent not in roles or re.search(r"\b(BLOCKED|NEEDS_CONTEXT)\b", data.get("last_assistant_message") or ""):
        sys.exit(0)

    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or ".").resolve()
    state_file = root / ".team" / "state" / "dev-gate.json"
    state_file.parent.mkdir(parents=True, exist_ok=True)
    try:
        state = json.loads(state_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        state = {}
    agent_id = data.get("agent_id") or agent
    cwd = Path(data.get("cwd") or root)
    env = dict(os.environ, TEAM_GATE_DIR=str(cwd if (cwd / "package.json").exists() else root))
    try:
        proc = subprocess.run(["bash", str(root / "team" / "bin" / "quality-gate.sh"), "fast", "--hook"],
                              cwd=root, env=env, capture_output=True, text=True, timeout=840)
        code, output = proc.returncode, proc.stdout + proc.stderr
    except subprocess.TimeoutExpired:
        code, output = 0, "quality-gate timed out — skipped"

    if code == 0:
        state.pop(agent_id, None)
        state_file.write_text(json.dumps(state), encoding="utf-8")
        sys.exit(0)
    retries = int(os.environ.get("TEAM_DEV_GATE_RETRIES", "2"))
    state[agent_id] = count = state.get(agent_id, 0) + 1
    state_file.write_text(json.dumps(state), encoding="utf-8")
    if count > retries:
        print(json.dumps({"systemMessage": f"dev-gate: {agent} finished with a red quality-gate after {retries} bounces — "
                                           "the lead must triage (bash team/bin/quality-gate.sh fast)."}))
        sys.exit(0)
    tail = "\n".join(output.strip().splitlines()[-60:])
    print(f"{tail}\n\n[dev-gate {count}/{retries}] Work not accepted: quality-gate fast is red. Fix the root cause "
          "(never disable checks, delete or weaken tests), rerun `bash team/bin/quality-gate.sh fast`, then hand in. "
          "If the failure is unrelated to your task, end with status BLOCKED and explain.", file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
