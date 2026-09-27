---
id: T-004
type: task
title: "Test strategy, harness and CI"
status: todo
milestone: M0
owner: qa-automation
priority: P0
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## What to do

…

## Definition of done

- [ ] docs/qa/TEST-STRATEGY.md defines the pyramid for web (Vitest), backend (pytest), extension, integration/RLS and e2e (Playwright) including how third-party integrations are faked
- [ ] `bash team/bin/quality-gate.sh fast` and `full` run lint, typecheck, unit, integration and e2e smoke for all packages and pass on the skeleton
- [ ] CI workflow runs the same gate on push; an e2e smoke test opens the health page

## Log

- 2026-09-27 12:11 created (team-lead)
