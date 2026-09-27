---
id: S-017
type: story
title: Application history and credit ledger
status: todo
milestone: M3
owner: frontend-dev
priority: P0
depends_on: [S-015]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a user with applications, When they open History, Then they see each application's vacancy, company, channel, status (prepared, queued, sent, failed, skipped, applied manually), timestamps and credits, and can filter by status, channel and search
- [ ] Given the user opens an application, Then they see the exact text and attachment that were sent
- [ ] Given the user opens Credits, Then they see the balance and the ledger (sign-up bonus, spend, refund) and the balance equals the sum of the ledger
- [ ] Given another user's application or ledger entry, Then it is never visible or accessible
- [ ] Given no applications yet, Then an empty state points to the feed

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
