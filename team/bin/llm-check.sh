#!/usr/bin/env bash
# Smoke-test the model backend Claude Code will use: it must answer on /v1/messages
# AND return a real tool_use block (models that reply in prose silently break every role).
# Usage: bash team/bin/llm-check.sh [model ...]   (default: the opus/sonnet/haiku models from env or .claude/settings.local.json)
set -uo pipefail
cd "$(dirname "$0")/../.."

# Fill unset vars from .claude/settings.local.json -> env
eval "$(python3 - <<'PY'
import json, os, shlex
try:
    env = json.load(open('.claude/settings.local.json')).get('env', {})
except Exception:
    env = {}
for k in ('ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_DEFAULT_OPUS_MODEL',
          'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL'):
    if not os.environ.get(k) and env.get(k):
        print(f'export {k}={shlex.quote(env[k])}')
PY
)"

BASE="${ANTHROPIC_BASE_URL:-}"
TOKEN="${ANTHROPIC_AUTH_TOKEN:-${ANTHROPIC_API_KEY:-none}}"
if [ -z "$BASE" ]; then
  echo "ANTHROPIC_BASE_URL is not set (env or .claude/settings.local.json) - nothing to check"; exit 2
fi

if [ $# -gt 0 ]; then MODELS=("$@"); else
  MODELS=()
  for m in "${ANTHROPIC_DEFAULT_OPUS_MODEL:-}" "${ANTHROPIC_DEFAULT_SONNET_MODEL:-}" "${ANTHROPIC_DEFAULT_HAIKU_MODEL:-}"; do
    [ -n "$m" ] && [[ ! " ${MODELS[*]:-} " =~ " $m " ]] && MODELS+=("$m")
  done
fi
[ ${#MODELS[@]} -eq 0 ] && { echo "no models to check"; exit 2; }

fail=0
for model in "${MODELS[@]}"; do
  body=$(python3 -c '
import json, sys
print(json.dumps({"model": sys.argv[1], "max_tokens": 512,
  "tools": [{"name": "add", "description": "Add two integers",
             "input_schema": {"type": "object", "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}}, "required": ["a", "b"]}}],
  "messages": [{"role": "user", "content": "Use the add tool to add 2 and 3. Do not answer in text."}]}))' "$model")
  start=$(date +%s)
  resp=$(curl -sS -m "${LLM_CHECK_TIMEOUT:-300}" "${BASE%/}/v1/messages" \
    -H "content-type: application/json" -H "anthropic-version: 2023-06-01" \
    -H "x-api-key: $TOKEN" -H "Authorization: Bearer $TOKEN" -d "$body" 2>&1)
  secs=$(( $(date +%s) - start ))
  verdict=$(printf '%s' "$resp" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    r = json.loads(raw)
except Exception:
    print("FAIL no JSON: " + raw[:200].replace("\n", " ")); sys.exit()
if r.get("type") == "error" or "error" in r:
    e = r.get("error", r)
    print("FAIL error: " + str(e.get("message", e) if isinstance(e, dict) else e)[:200]); sys.exit()
calls = [c for c in r.get("content", []) if c.get("type") == "tool_use"]
if not calls:
    text = " ".join(c.get("text", "") for c in r.get("content", []) if c.get("type") == "text")
    print("FAIL answered in prose, no tool_use: " + text[:160].replace("\n", " ")); sys.exit()
c = calls[0]; a = c.get("input", {})
ok = c.get("name") == "add" and a.get("a") in (2, "2") and a.get("b") in (3, "3")
print(("OK tool_use " if ok else "WARN tool_use with odd args ") + json.dumps({"name": c.get("name"), "input": a}))
')
  echo "[$model] ${verdict} (${secs}s)"
  case "$verdict" in OK*) ;; *) fail=1 ;; esac
done
[ $fail -eq 0 ] && echo "PASS - the backend speaks Claude Code's protocol with tool calls" || echo "FAIL - see team/LOCAL-FREE.md -> Troubleshooting"
exit $fail
