# shellcheck shell=bash
# Project commands for quality-gate.sh and app.sh. The architect fills this in during M0.
# Empty = auto-detect: package manager from the lock file; checks from package.json scripts
# (lint, typecheck, test:unit|test, test:integration, test:e2e, build, dev).
# For non-JS stacks (Python, Go, …) set the commands explicitly.

PM=""                 # npm | pnpm | yarn | bun

CHECK_LINT=""         # e.g. "pnpm lint"
CHECK_TYPECHECK=""    # e.g. "pnpm typecheck"
CHECK_UNIT=""         # e.g. "pnpm test:unit"
CHECK_INTEGRATION=""  # e.g. "pnpm test:integration"
CHECK_E2E=""          # e.g. "pnpm test:e2e"
CHECK_BUILD=""        # e.g. "pnpm build"

APP_START_CMD=""      # e.g. "pnpm dev" (started in background by team/bin/app.sh)
APP_URL="http://localhost:3000"
APP_READY_PATH="/"    # path that returns 2xx/3xx once the app is ready
APP_START_TIMEOUT=120 # seconds

USE_SUPABASE="auto"   # auto (if supabase/config.toml exists) | yes | no
SUPABASE_START_ARGS="" # e.g. "-x studio,imgproxy,vector,logflare" to save RAM (cloud VMs: 4 vCPU / 16 GB)
