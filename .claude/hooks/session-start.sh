#!/usr/bin/env bash
# SessionStart: every new/resumed/compacted session gets the current board state and recent commits,
# so the lead picks up at the right step after a restart, /clear or compaction.
# In cloud sessions (CLAUDE_CODE_REMOTE=true) it also installs dependencies and checks the plugins.
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
[[ -f "$ROOT/team/bin/board.py" ]] || exit 0

if [[ "${CLAUDE_CODE_REMOTE:-}" == "true" ]]; then
  mkdir -p "$ROOT/.team/state"
  echo "[AI team] Cloud session — rules: team/CLOUD.md (push the working branch after every phase; never push main)."
  plugins="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json"
  if ! grep -q '"superpowers@' "$plugins" 2>/dev/null; then
    echo "  ⚠ superpowers is not installed in this cloud environment: superpowers:* skills are unavailable."
    echo "    Tell the human: add team/cloud/setup-script.sh as the environment's setup script (team/CLOUD.md), then start a new session."
  fi
  if [[ -f "$ROOT/package.json" && ! -d "$ROOT/node_modules" ]]; then
    (
      cd "$ROOT" || exit 1
      if [[ -f pnpm-lock.yaml ]]; then corepack enable >/dev/null 2>&1; pnpm install --frozen-lockfile
      elif [[ -f yarn.lock ]]; then corepack enable >/dev/null 2>&1; yarn install --immutable
      elif [[ -f package-lock.json ]]; then npm ci
      else npm install; fi
    ) >"$ROOT/.team/state/deps-install.log" 2>&1 \
      && echo "  Dependencies installed." \
      || echo "  ⚠ Dependency install failed — see .team/state/deps-install.log"
  fi
  echo "  Working branch: $(git -C "$ROOT" branch --show-current 2>/dev/null || echo '?')"
fi

python3 "$ROOT/team/bin/board.py" brief 2>/dev/null || true
exit 0
