#!/usr/bin/env bash
# setup.sh — install everything the AI team uses. Idempotent; continues past failures and reports them.
#
#   bash team/bin/setup.sh [--dry-run] [--skip-plugins] [--skip-clis] [--with-strix] [--with-claude-mem]
#
# Installs: Claude Code plugins (superpowers, frontend-design, typescript-lsp, security-guidance, context7,
# supabase, ui-ux-pro-max), playwright-cli + skills, TypeScript LSP binaries; optional Strix and claude-mem.
# Never runs `curl | sh` for you — such installers are printed for you to run.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY=0 PLUGINS=1 CLIS=1 STRIX=0 MEM=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --skip-plugins) PLUGINS=0 ;;
    --skip-clis) CLIS=0 ;;
    --with-strix) STRIX=1 ;;
    --with-claude-mem) MEM=1 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 64 ;;
  esac
done
cd "$ROOT" || exit 1
FAILED=()
have() { command -v "$1" >/dev/null 2>&1; }
run() {
  echo "▶ $*"
  [[ $DRY -eq 1 ]] && return 0
  if ! "$@"; then echo "  ✗ failed: $*"; FAILED+=("$*"); fi
}
section() { echo; echo "== $1"; }

section "Prerequisites"
have node && echo "node $(node --version)" || { echo "✗ Node.js 20+ required: https://nodejs.org"; FAILED+=("node"); }
have python3 && echo "python3 $(python3 --version 2>&1)" || { echo "✗ Python 3.9+ required"; FAILED+=("python3"); }
have git || { echo "✗ git required"; FAILED+=("git"); }
have docker && docker info >/dev/null 2>&1 && echo "docker: running" || echo "! Docker not running — needed for local Supabase and Strix"
have claude || echo "! claude CLI not found — install Claude Code first: https://code.claude.com"

if [[ $PLUGINS -eq 1 ]] && have claude; then
  section "Claude Code plugins (project scope)"
  run claude plugin marketplace add anthropics/claude-plugins-official
  run claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
  for p in superpowers frontend-design typescript-lsp security-guidance context7 supabase; do
    run claude plugin install "$p@claude-plugins-official" --scope project
  done
  run claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill --scope project
  if [[ $MEM -eq 1 ]]; then
    run claude plugin marketplace add thedotmack/claude-mem
    run claude plugin install claude-mem@thedotmack --scope user
  fi
fi

if [[ $CLIS -eq 1 ]]; then
  section "CLIs"
  have playwright-cli || run npm install -g @playwright/cli@latest
  have playwright-cli && run playwright-cli install --skills
  have typescript-language-server || run npm install -g typescript typescript-language-server
  if ! have supabase; then
    echo "! Supabase CLI not on PATH — scripts fall back to 'npx supabase'. Recommended: brew install supabase/tap/supabase (or see https://supabase.com/docs/guides/local-development/cli/getting-started)"
  fi
fi

if [[ $STRIX -eq 1 ]]; then
  section "Strix (security)"
  if have strix; then echo "strix: $(strix --version 2>/dev/null || echo installed)"
  elif have pipx; then run pipx install strix-agent
  else echo "! install Strix yourself: curl -sSL https://strix.ai/install | bash   (or: pipx install strix-agent)"; fi
  echo "  Optional agent skills: npx skills add usestrix/strix"
  echo "  Configure: export LLM_API_KEY=sk-ant-…  (model is preset to Sonnet; see team/SETUP.md)"
fi

section "Project"
run python3 team/bin/board.py init
run chmod +x .claude/hooks/*.sh .claude/hooks/*.py team/bin/*.sh team/bin/*.py
if [[ ! -d .git ]]; then run git init -b main; fi

section "Doctor"
[[ $DRY -eq 1 ]] || bash team/bin/doctor.sh --quick

echo
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "Done with ${#FAILED[@]} failed step(s):"; printf '  - %s\n' "${FAILED[@]}"
  echo "Plugins can also be installed inside Claude Code: /plugin install <name>@<marketplace>"
  exit 1
fi
echo "✓ setup complete. Next: claude → /mvp-kickoff <your product idea>"
