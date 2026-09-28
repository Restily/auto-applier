---
id: T-011
type: task
title: "M1 plan Task 0B: M1 web dependencies, scripts and shadcn primitives"
status: done
milestone: M1
owner: frontend-dev
priority: P0
files: [package.json, package-lock.json, apps/web/package.json, apps/web/components.json, apps/web/src/components/ui/**, apps/web/src/hooks/**, apps/web/src/app/globals.css]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Plan task 0B implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 09:17 todo → in_progress (team-lead)
- 2026-09-28 12:36 in_progress → qa (frontend-dev): npm deps + shadcn primitives complete; fixed sidebar hsl literals -> token refs, dropped redundant .dark block; fixed 2 react-hooks/purity lint errors (sidebar Math.random -> lazy useState init, use-mobile setState-in-effect -> useSyncExternalStore); npm ci clean, lint/typecheck/test:unit/build/quality-gate fast all PASS
- 2026-09-28 12:38 AC 1 ✔ (team-lead): lead verified: quality-gate fast PASS after wave-1 commit
- 2026-09-28 12:38 qa → done (team-lead): wave 1 committed
