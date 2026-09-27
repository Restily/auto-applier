---
id: T-001
type: task
title: "Architecture, stack and ADRs"
status: todo
milestone: M0
owner: architect
priority: P0
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## What to do

…

## Definition of done

- [ ] Given the approved PRD, When the architect finishes, Then docs/architecture/ARCHITECTURE.md describes components (Next.js web app, Python API and workers, Supabase, Chrome extension, LLM layer, integration adapters) and their boundaries
- [ ] ADRs exist for: web stack + UI component library, Python backend framework and job queue/scheduler, Chrome extension (MV3) architecture and pairing, LLM provider abstraction (Claude default, pluggable), integration adapters with fakes/fixtures, secret encryption at rest, payments providers (Stripe, USDT gateway, Telegram Stars)
- [ ] team/config.sh contains the real lint/typecheck/test/e2e/build commands for all packages (web, backend, extension)

## Log

- 2026-09-27 12:11 created (team-lead)
