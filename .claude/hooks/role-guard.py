#!/usr/bin/env python3
"""PreToolUse(Edit|Write|NotebookEdit): each role writes only to its own files (team/ownership.json).

Why: QA doesn't "fix" code to make a test pass, devs don't rewrite the PRD or QA reports,
nobody edits the board by hand (board.py only), and no subagent touches the control plane.
Violations are denied with a hint on how to hand the work to the owner. Disable: TEAM_ROLE_GUARD=off.
"""
import json
import os
import re
import sys
from pathlib import Path


def glob_re(pattern: str) -> re.Pattern:
    out, i = "", 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out, i = out + "(?:.*/)?", i + 3
        elif pattern.startswith("**", i):
            out, i = out + ".*", i + 2
        elif pattern[i] == "*":
            out, i = out + "[^/]*", i + 1
        elif pattern[i] == "?":
            out, i = out + "[^/]", i + 1
        else:
            out, i = out + re.escape(pattern[i]), i + 1
    return re.compile(rf"^{out}$")


def matches(path: str, patterns) -> bool:
    return any(glob_re(p).match(path) for p in patterns or [])


def deny(reason: str) -> None:
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": f"[role-guard] {reason}",
    }}))
    sys.exit(0)


def main() -> None:
    if os.environ.get("TEAM_ROLE_GUARD", "on") == "off":
        sys.exit(0)
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)
    agent = data.get("agent_type")
    if not agent:
        sys.exit(0)  # main session (human or lead without --agent)
    tool_input = data.get("tool_input") or {}
    raw = tool_input.get("file_path") or tool_input.get("notebook_path") or tool_input.get("path")
    if not raw:
        sys.exit(0)
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or ".").resolve()
    cwd = Path(data.get("cwd") or root)
    target = (Path(raw) if os.path.isabs(raw) else cwd / raw).resolve()
    try:
        rel = target.relative_to(root).as_posix()
    except ValueError:
        sys.exit(0)  # outside the project (scratchpad, /tmp)
    try:
        cfg = json.loads((root / "team" / "ownership.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        sys.exit(0)
    role = cfg.get("aliases", {}).get(agent, agent)
    rules = cfg.get("roles", {}).get(role)
    if rules is None:
        sys.exit(0)  # unknown agent type (built-ins, superpowers reviewers) — unrestricted
    if matches(rel, [f".claude/agent-memory/{agent}/**", f".claude/agent-memory-local/{agent}/**"]):
        sys.exit(0)
    if rel.startswith("docs/tasks/"):
        deny("the board is changed only via `python3 team/bin/board.py` (new/move/set/check/note). Never edit docs/tasks by hand.")
    if matches(rel, rules.get("deny")) or not matches(rel, rules.get("allow")):
        owners = [r for r, rr in cfg.get("roles", {}).items()
                  if r != role and matches(rel, rr.get("allow")) and not matches(rel, rr.get("deny"))]
        hint = f" Owners: {', '.join(owners)}." if owners else ""
        deny(f"role {role} may not modify {rel}.{hint} Hand it over: "
             f"python3 team/bin/board.py new task|bug \"…\" --owner <role> --milestone <M> (or flag it in your report).")
    sys.exit(0)


if __name__ == "__main__":
    main()
