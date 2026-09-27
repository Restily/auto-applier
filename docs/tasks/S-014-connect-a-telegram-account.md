---
id: S-014
type: story
title: Connect a Telegram account
status: todo
milestone: M3
owner: backend-dev
priority: P0
depends_on: [S-001]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a user accepts the risk notice and enters a phone number, When they enter the login code (and the 2FA password if enabled), Then the account is connected and shows its @username (fake Telegram in tests)
- [ ] Given a wrong code or 2FA password, Then an error is shown and the user can retry; when Telegram imposes a wait, the remaining wait time is shown
- [ ] Given a connected account, Then the session is encrypted at rest and never returned to the browser
- [ ] Given the user disconnects, Then the Telegram session is terminated and deleted
- [ ] Given Telegram reports the session revoked or the account restricted, Then the connection shows 'Needs attention', Telegram sending pauses and the user sees an in-app notice

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
