---
id: S-024
type: story
title: Pay with Telegram Stars
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

- [ ] Given a user chooses a plan and Telegram Stars, When they open the platform bot through the provided link, Then the bot shows an invoice linked to their platform account
- [ ] Given a successful Stars payment (fake Bot API in tests), Then the plan is active for 30 days and its credits are added once
- [ ] Given a payment from a Telegram user not linked to a platform account, or a repeated payment update, Then no credits are misattributed or duplicated

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
