# shellcheck shell=bash
# Project commands for quality-gate.sh and app.sh. AutoApplier values (architect, M0; ADR-0011/0012):
# npm workspaces (apps/web) + uv project backend/; `npm run dev` = sync_env + valkey start + api/worker/beat/web.
# The architect fills this in during M0.
# Empty = auto-detect: package manager from the lock file; checks from package.json scripts
# (lint, typecheck, test:unit|test, test:integration, test:e2e, build, dev).
# For non-JS stacks (Python, Go, …) set the commands explicitly.

PM="npm"                 # npm | pnpm | yarn | bun

CHECK_LINT="npm run -s lint"         # e.g. "pnpm lint"
CHECK_TYPECHECK="npm run -s typecheck"    # e.g. "pnpm typecheck"
CHECK_UNIT="npm run -s test:unit"         # e.g. "pnpm test:unit"
CHECK_INTEGRATION="npm run -s test:integration"  # e.g. "pnpm test:integration"
CHECK_E2E="npm run -s test:e2e"          # e.g. "pnpm test:e2e"
CHECK_BUILD="npm run -s build"        # e.g. "pnpm build"

APP_START_CMD="npm run dev"      # e.g. "pnpm dev" (started in background by team/bin/app.sh)
APP_URL="http://localhost:3000"
APP_READY_PATH="/api/health"    # path that returns 2xx/3xx once the app is ready
APP_START_TIMEOUT=180 # seconds

USE_SUPABASE="auto"   # auto (if supabase/config.toml exists) | yes | no
SUPABASE_START_ARGS="-x studio,imgproxy,vector,logflare" # e.g. "-x studio,imgproxy,vector,logflare" to save RAM (cloud VMs: 4 vCPU / 16 GB)
