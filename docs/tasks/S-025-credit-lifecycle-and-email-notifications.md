---
id: S-025
type: story
title: Credit lifecycle and email notifications
status: todo
milestone: M5
owner: backend-dev
priority: P0
depends_on: [S-022]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given the balance reaches 0, Then autopilot pauses on all searches, an in-app banner and an 'out of credits' email are shown/sent (local mail catcher), and after credits are added the searches that were in autopilot resume automatically
- [ ] Given a prepaid 30-day period (crypto or Stars) ends in 3 days, Then the user receives a reminder email; when it ends, the remaining plan credits expire with a ledger entry
- [ ] Given a channel goes to 'Needs attention', Then the user receives an email about it
- [ ] Given many applications sending concurrently, Then the balance never becomes negative and always equals the sum of the ledger
- [ ] Given the user opts out of non-essential emails in settings, Then only essential emails (password reset, payments) are sent

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
