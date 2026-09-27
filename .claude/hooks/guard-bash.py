#!/usr/bin/env python3
"""PreToolUse(Bash): deny commands that leave the autonomy boundary (docs/product/AUTONOMY.md).

Hooks run in every permission mode (including auto and bypassPermissions).
Pushing: locally only the human pushes (override: TEAM_ALLOW_PUSH=1). In cloud sessions
(CLAUDE_CODE_REMOTE=true) pushing the working branch is allowed — it's the only way work survives
the VM — but never to main/master and never with force (override: TEAM_ALLOW_PUSH=0).
  TEAM_BASH_GUARD=off  disable this hook
"""
import json
import os
import re
import shlex
import subprocess
import sys

LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal", "[::1]"}

RULES = [
    (r"\brm\s+(?:-\w+\s+)*-\w*[rR]\w*\s+(?:-\w+\s+)*(?:/|/\*|~|~/|\$HOME|\.|\./|\.\.|\.\./|\.git|\*)(?:\s|$)",
     "recursive delete of root/home/repo is forbidden. Delete specific paths.", None),
    (r"\bsupabase\s+(?:db\s+push|link|projects\s+(?:create|delete)|functions\s+deploy|secrets\s+set|branches\s+(?:create|delete))\b"
     r"|\bsupabase\s+db\s+reset\b[^\n;&|]*--linked",
     "cloud Supabase operations are forbidden: work with the local stack only (supabase start).", None),
    (r"\b(?:vercel|netlify|flyctl|fly|railway|heroku|wrangler)\b[^\n;&|]*\b(?:deploy|up|publish|--prod)\b",
     "only the human deploys.", None),
    (r"\b(?:npm|pnpm|yarn|bun)\s+publish\b|\bdocker\s+push\b|\bgh\s+(?:release\s+create|repo\s+(?:create|delete)|pr\s+merge)\b",
     "publishing and remote repository operations are done by the human.", None),
    (r"\b(?:curl|wget)\b[^\n;&]*\|\s*(?:sudo\s+)?(?:ba|z|da)?sh\b",
     "piping downloads into a shell is forbidden. Ask the human to install the tool (team/SETUP.md).", None),
    (r"(?:^|[;&|]\s*)sudo\b", "sudo is forbidden.", None),
    (r"(?i)\bDROP\s+(?:DATABASE|SCHEMA)\b", "DROP DATABASE/SCHEMA is forbidden; for the local DB use `supabase db reset`.", None),
    (r"\b(?:rm|mv|unlink)\b[^;&|\n]*\.team/STOP\b", "only the human removes the .team/STOP kill switch.", None),
]

# Subagents must not rewrite the control plane (hooks, settings, agents, team scripts).
PROT = r"(?:\.claude/(?:hooks|agents)/|\.claude/settings[^\s'\"]*\.json|team/ownership\.json|team/bin/)"
PROTECTED_WRITE = re.compile(
    rf"(?:>>?|\btee\s+(?:-a\s+)?)\s*['\"]?[^\s;&|'\"]*{PROT}"
    rf"|\b(?:sed\s+-i\S*|rm|mv|cp|chmod|chown|truncate|ln|install|perl\s+-\S*i)\b[^;&|\n]*{PROT}"
    rf"|\b(?:python3?|node|ruby)\s+-(?:c|e)\b[^\n]*{PROT}"
)


def deny(reason: str) -> None:
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": f"[guard-bash] {reason}",
    }}))
    sys.exit(0)


def push_allowed() -> bool:
    flag = os.environ.get("TEAM_ALLOW_PUSH")
    if flag in ("0", "1"):
        return flag == "1"
    return os.environ.get("CLAUDE_CODE_REMOTE") == "true"


def check_push(cmd: str, cwd: str) -> None:
    for segment in re.split(r"&&|\|\||;|\n", cmd):
        m = re.search(r"\bgit\s+(?:-C\s+\S+\s+)?push\b(.*)", segment)
        if not m:
            continue
        if not push_allowed():
            deny("only the human pushes (see docs/product/AUTONOMY.md). Commit locally and continue.")
        args = m.group(1).split()
        if any(a in ("-f", "--force", "--mirror", "--delete", "-d") or a.startswith("--force") or a.startswith("+") for a in args):
            deny("force/mirror/delete pushes are forbidden.")
        if any(re.search(r"(^|:)(main|master)$", a) for a in args):
            deny("never push to main/master; push the working branch and let the human open a PR.")
        refs = [a for a in args if not a.startswith("-")]
        if len(refs) < 2:  # no explicit branch: pushes the current branch
            try:
                branch = subprocess.run(["git", "branch", "--show-current"], cwd=cwd or None,
                                        capture_output=True, text=True, timeout=5).stdout.strip()
            except (OSError, subprocess.TimeoutExpired):
                branch = ""
            if branch in ("main", "master"):
                deny("the current branch is main/master — never push it; switch to the working branch.")


def check_strix(cmd: str) -> None:
    if not re.search(r"\bstrix\b", cmd):
        return
    try:
        tokens = shlex.split(cmd)
    except ValueError:
        tokens = cmd.split()
    targets = [tokens[i + 1] for i, t in enumerate(tokens[:-1]) if t in ("-t", "--target")]
    targets += [t.split("=", 1)[1] for t in tokens if t.startswith("--target=")]
    for t in targets:
        m = re.match(r"^[a-z]+://([^/:]+|\[[^\]]+\])", t)
        if m and m.group(1).lower() not in LOCAL_HOSTS:
            deny(f"strix may only target localhost and local source; '{t}' is out of scope.")
        if not m and re.match(r"^[\w-]+(\.[\w-]+)+(/|$)", t) and not t.startswith("."):
            deny(f"strix target '{t}' looks like an external domain — out of scope. Use ./ or http://localhost:…")


def main() -> None:
    if os.environ.get("TEAM_BASH_GUARD", "on") == "off":
        sys.exit(0)
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)
    cmd = (data.get("tool_input") or {}).get("command") or ""
    if not cmd:
        sys.exit(0)
    for pattern, reason, _tag in RULES:
        if re.search(pattern, cmd):
            deny(reason)
    check_push(cmd, data.get("cwd") or "")
    check_strix(cmd)
    if data.get("agent_type") and PROTECTED_WRITE.search(cmd):
        deny("subagents may not modify hooks, settings, agent definitions or team scripts. Propose the change in your report to the lead.")
    sys.exit(0)


if __name__ == "__main__":
    main()
