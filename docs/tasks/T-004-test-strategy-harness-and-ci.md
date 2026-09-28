---
id: T-004
type: task
title: "Test strategy, harness and CI"
status: qa
milestone: M0
owner: qa-automation
priority: P0
plan: docs/superpowers/plans/2026-09-27-M0-foundations.md
needs_human: false
created: 2026-09-27
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] docs/qa/TEST-STRATEGY.md defines the pyramid for web (Vitest), backend (pytest), extension, integration/RLS and e2e (Playwright) including how third-party integrations are faked
- [x] `bash team/bin/quality-gate.sh fast` and `full` run lint, typecheck, unit, integration and e2e smoke for all packages and pass on the skeleton
- [x] CI workflow runs the same gate on push; an e2e smoke test opens the health page

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 12:38 set plan=docs/superpowers/plans/2026-09-27-M0-foundations.md (team-lead)
- 2026-09-27 13:01 AC 1 ✔ (qa-automation): docs/qa/TEST-STRATEGY.md
- 2026-09-27 13:05 todo → in_progress (team-lead)
- 2026-09-28 08:02 in_progress → qa (team-lead): harness, strategy, CI merged; gate full green
- 2026-09-28 08:05 AC 2 ✔ (qa-automation): quality-gate.sh full PASS (lint,typecheck,unit,integration,build,e2e); npm run test:db (pgTAP) PASS; see docs/qa/reports/M0-tests.md
- 2026-09-28 08:05 AC 3 ✔ (qa-automation): tests/integration/ci-workflow.test.ts PASS; tests/e2e/health.spec.ts PASS; .github/workflows/ci.yml reviewed, runs quality-gate.sh full on push/PR with Valkey+Supabase+Chromium; see docs/qa/reports/M0-tests.md
- 2026-09-28 08:05 AC 2 ✔ (qa-manual): bash team/bin/quality-gate.sh fast: lint/typecheck/unit all PASS on skeleton (ran live). full gate composition verified in team/config.sh (lint+typecheck+unit+integration+e2e per package)
- 2026-09-28 08:05 AC 3 ✔ (qa-manual): .github/workflows/ci.yml runs 'quality-gate.sh full' on push/PR after starting Valkey and Supabase CLI; tests/e2e/health.spec.ts is the e2e smoke test opening the health page
