---
id: T-001
type: task
title: "Architecture, stack and ADRs"
status: done
milestone: M0
owner: architect
priority: P0
plan: docs/superpowers/plans/2026-09-27-M0-foundations.md
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## What to do

…

## Definition of done

- [x] Given the approved PRD, When the architect finishes, Then docs/architecture/ARCHITECTURE.md describes components (Next.js web app, Python API and workers, Supabase, Chrome extension, LLM layer, integration adapters) and their boundaries
- [x] ADRs exist for: web stack + UI component library, Python backend framework and job queue/scheduler, Chrome extension (MV3) architecture and pairing, LLM provider abstraction (Claude default, pluggable), integration adapters with fakes/fixtures, secret encryption at rest, payments providers (Stripe, USDT gateway, Telegram Stars)
- [x] team/config.sh contains the real lint/typecheck/test/e2e/build commands for all packages (web, backend, extension)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 12:38 set plan=docs/superpowers/plans/2026-09-27-M0-foundations.md (team-lead)
- 2026-09-27 12:38 todo → in_progress (architect)
- 2026-09-27 12:38 AC 1 ✔ (architect): docs/architecture/ARCHITECTURE.md (Components and boundaries, Modules and layering)
- 2026-09-27 12:38 AC 2 ✔ (architect): docs/architecture/adr/ADR-0001..ADR-0011 (web stack, backend, queue, boundaries/auth, extension, LLM, adapters, secrets, payments, i18n, runtime)
- 2026-09-27 12:38 AC 3 ✔ (architect): team/config.sh (CHECK_* = root npm scripts fanning out to web/backend/extension; mapping documented in file and ARCHITECTURE.md Scripts contract)
- 2026-09-27 12:38 in_progress → done (architect): ARCHITECTURE.md, 11 ADRs, TECH-DEBT.md, team/config.sh, M0 plan docs/superpowers/plans/2026-09-27-M0-foundations.md
