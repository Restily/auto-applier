#!/usr/bin/env bash
# doctor.sh — verify the AI team setup: tools, config files, hook self-tests, board.
#   bash team/bin/doctor.sh [--quick]    (--quick never calls `claude plugin list`)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
QUICK=0; [[ "${1:-}" == "--quick" ]] && QUICK=1
cd "$ROOT" || exit 1
PROBLEMS=0
ok() { echo "  ✓ $*"; }
warn() { echo "  ! $*"; }
bad() { echo "  ✗ $*"; PROBLEMS=$((PROBLEMS + 1)); }
have() { command -v "$1" >/dev/null 2>&1; }
ver() { "$@" 2>/dev/null | head -n1; }

echo "Tools"
if have node; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  (( major >= 20 )) && ok "node $(node --version)" || bad "node $(node --version) — need 20+"
else bad "node missing"; fi
have python3 && ok "$(python3 --version 2>&1)" || bad "python3 missing"
have git && ok "$(git --version)" || bad "git missing"
if have docker && docker info >/dev/null 2>&1; then ok "docker running"; else warn "docker not running (local Supabase, Strix)"; fi
have claude && ok "claude $(ver claude --version)" || bad "claude CLI missing"
have playwright-cli && ok "playwright-cli $(ver playwright-cli --version)" || warn "playwright-cli missing (manual QA) — npm i -g @playwright/cli@latest"
have supabase && ok "supabase $(ver supabase --version)" || warn "supabase CLI not on PATH (scripts use npx supabase)"
have typescript-language-server && ok "typescript-language-server" || warn "typescript-language-server missing (typescript-lsp plugin)"
have strix && ok "strix installed" || warn "strix missing (security audit in MR) — team/SETUP.md"

echo "Plugins"
PLUGINS_FILE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json"
if [[ -f "$PLUGINS_FILE" ]]; then
  list="$(cat "$PLUGINS_FILE")"
elif [[ $QUICK -eq 0 ]] && have claude; then
  list="$(claude plugin list 2>/dev/null || true)"
else
  list=""
fi
for p in superpowers frontend-design typescript-lsp security-guidance context7 supabase ui-ux-pro-max; do
  grep -q "\"\?$p@" <<<"$list" && ok "$p" || bad "$p not installed — bash team/bin/setup.sh (cloud: team/cloud/setup-script.sh)"
done

if [[ "${CLAUDE_CODE_REMOTE:-}" == "true" ]]; then
  echo "Cloud network (host → HTTP status; 000/403 = blocked by the environment allowlist)"
  for url in https://registry.npmjs.org https://proxy.golang.org https://public.ecr.aws/v2/ \
             https://mcp.context7.com/mcp https://fonts.gstatic.com https://cdn.playwright.dev; do
    code=$(curl -s -o /dev/null -m 8 -w '%{http_code}' "$url" 2>/dev/null); code=${code:-000}
    if [[ "$code" == "000" || "$code" == "403" ]]; then warn "$url → $code (add the host to the environment's allowed domains, team/CLOUD.md)"
    else ok "$url → $code"; fi
  done
fi

echo "Config"
for f in .claude/settings.json .mcp.json team/ownership.json; do
  python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$f" 2>/dev/null && ok "$f valid JSON" || bad "$f invalid or missing"
done
for f in .claude/hooks/*.py .claude/hooks/*.sh team/bin/*.sh team/bin/*.py; do
  [[ -x "$f" ]] || { warn "$f not executable — chmod +x"; }
done

echo "Hook self-tests"
out=$(echo '{"tool_input":{"command":"git push origin main"}}' | python3 .claude/hooks/guard-bash.py)
[[ "$out" == *'"deny"'* ]] && ok "guard-bash blocks git push" || bad "guard-bash did not block git push"
out=$(echo '{"tool_input":{"command":"npm test"}}' | python3 .claude/hooks/guard-bash.py)
[[ -z "$out" ]] && ok "guard-bash allows npm test" || bad "guard-bash blocked npm test"
out=$(printf '{"agent_type":"qa-manual","cwd":"%s","tool_input":{"file_path":"src/app/page.tsx"}}' "$ROOT" | CLAUDE_PROJECT_DIR="$ROOT" python3 .claude/hooks/role-guard.py)
[[ "$out" == *'"deny"'* ]] && ok "role-guard blocks qa-manual editing src/" || bad "role-guard did not block qa-manual"
out=$(printf '{"agent_type":"backend-dev","cwd":"%s","tool_input":{"file_path":"src/lib/db.ts"}}' "$ROOT" | CLAUDE_PROJECT_DIR="$ROOT" python3 .claude/hooks/role-guard.py)
[[ -z "$out" ]] && ok "role-guard allows backend-dev editing src/" || bad "role-guard blocked backend-dev"

echo "Board"
if python3 team/bin/board.py validate >/dev/null 2>&1; then ok "board valid"; else bad "board invalid — python3 team/bin/board.py validate"; fi
python3 team/bin/board.py next-step | sed 's/^/  → /'

echo
if (( PROBLEMS > 0 )); then echo "doctor: $PROBLEMS problem(s)"; exit 1; fi
echo "doctor: OK"
