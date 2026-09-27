---
id: S-012
type: story
title: "Operator back office: Telegram channel catalog and source health"
status: todo
milestone: M2
owner: frontend-dev
priority: P1
depends_on: [S-008, S-009]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a user with the operator role, When they open the back office, Then they see every source with last successful fetch, vacancies in the last 24 h and recent errors; a source without a successful fetch for more than 2 hours is highlighted
- [ ] Given the operator adds or disables a catalog channel, Then a disabled channel is no longer fetched and an added public channel starts being fetched
- [ ] Given a non-operator user, When they open the back office or call its API, Then access is denied

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 20:30 note (designer): Screen spec completed: sources/health table (new MASTER §5.3 pattern, stale >2h flagged 3 redundant ways), add/disable catalog channel (reuses §5.2), Access denied state (courtesy only, real gate is backend RLS).
