---
id: T-030
type: task
title: Log the underlying Supabase error before throwing generic load errors (profile_load_failed etc.)
status: done
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

- [x] …

## Log

- 2026-10-04 18:56 created (frontend-dev)
- 2026-10-04 19:09 note (frontend-dev): logDbError (src/lib/log.ts) logs [db] scope code message (no details/hint) before throwing unchanged profile_load_failed / resume_load_failed; tests in lib/log.test.ts, profile/queries.test.ts, resume/queries.test.ts
- 2026-10-04 19:09 AC 1 ✔ (frontend-dev): apps/web/src/lib/profile/queries.test.ts
- 2026-10-04 19:09 todo → done (frontend-dev): unit tests + fast gate green
