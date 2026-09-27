#!/bin/bash
# Cloud environment setup script for the AI product team.
# Paste the whole file into claude.ai/code → environment settings → "Setup script".
# It runs once before Claude Code launches; if it finishes in ~5 minutes the result is cached
# for new sessions (~7 days). It must not depend on the repository (it may not be cloned yet).
#
# Why: cloud sessions do NOT install plugins declared in the repo's .claude/settings.json.
# Installing them here (user scope, before launch) makes them load exactly as they do locally.

log() { echo "[ai-team setup] $*"; }

# 1. Claude Code plugins -------------------------------------------------------------------
if command -v claude >/dev/null 2>&1; then
  claude plugin marketplace add anthropics/claude-plugins-official || log "marketplace add failed: claude-plugins-official"
  claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill || log "marketplace add failed: ui-ux-pro-max-skill"
  for p in superpowers frontend-design typescript-lsp security-guidance context7 supabase; do
    claude plugin install "$p@claude-plugins-official" --scope user || log "plugin install failed: $p"
  done
  claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill --scope user || log "plugin install failed: ui-ux-pro-max"
else
  log "claude CLI not found in the setup phase — plugins not installed"
fi

# 2. CLIs (in parallel to stay under the 5-minute cache limit) --------------------------------
(
  npm install -g @playwright/cli@latest typescript typescript-language-server \
    && playwright-cli install --skills -g
) > /tmp/ai-team-npm.log 2>&1 &

# Supabase CLI: GitHub release downloads are blocked for repos not attached to the session,
# so build it from the Go module proxy (proxy.golang.org is on the Trusted allowlist).
(
  command -v supabase >/dev/null 2>&1 || {
    GOBIN=/usr/local/bin go install github.com/supabase/cli@latest \
      && ln -sf /usr/local/bin/cli /usr/local/bin/supabase
  }
) > /tmp/ai-team-supabase.log 2>&1 &

# Optional: Strix for the release security audit. Model is preset to Sonnet in .claude/settings.json;
# set LLM_API_KEY (Anthropic key) in the environment. AI_TEAM_WITH_STRIX=1 installs the CLI here.
if [ "${AI_TEAM_WITH_STRIX:-0}" = "1" ]; then
  (pipx install strix-agent || pip install --user strix-agent) > /tmp/ai-team-strix.log 2>&1 &
fi

wait
command -v playwright-cli >/dev/null && log "playwright-cli ok" || log "playwright-cli failed: see /tmp/ai-team-npm.log"
command -v supabase >/dev/null && log "supabase ok" || log "supabase CLI failed: see /tmp/ai-team-supabase.log (scripts fall back to npx supabase)"
log "done"
