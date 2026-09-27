---
id: T-004
type: task
title: "Test strategy, harness and CI"
status: in_progress
milestone: M0
owner: qa-automation
priority: P0
plan: docs/superpowers/plans/2026-09-27-M0-foundations.md
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## What to do

…

## Definition of done

- [x] docs/qa/TEST-STRATEGY.md defines the pyramid for web (Vitest), backend (pytest), extension, integration/RLS and e2e (Playwright) including how third-party integrations are faked
- [ ] `bash team/bin/quality-gate.sh fast` and `full` run lint, typecheck, unit, integration and e2e smoke for all packages and pass on the skeleton
- [ ] CI workflow runs the same gate on push; an e2e smoke test opens the health page

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 12:38 set plan=docs/superpowers/plans/2026-09-27-M0-foundations.md (team-lead)
- 2026-09-27 13:01 AC 1 ✔ (qa-automation): docs/qa/TEST-STRATEGY.md
- 2026-09-27 13:05 todo → in_progress (team-lead)
