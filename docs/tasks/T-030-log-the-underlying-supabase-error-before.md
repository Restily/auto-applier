---
id: T-030
type: task
title: Log the underlying Supabase error before throwing generic load errors (profile_load_failed etc.)
status: todo
milestone: M1
owner: frontend-dev
priority: P3
files: [apps/web/src/lib/profile/queries.ts]
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## What to do

Human hit profile_load_failed on a local run with no way to see the cause (likely missing migrations on a reused DB volume). Log error.code/message server-side (no PII) before throwing in getProfile and similar query helpers.

## Definition of done

- [ ] …

## Log

- 2026-10-04 18:56 created (frontend-dev)
