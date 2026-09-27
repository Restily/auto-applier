---
id: S-023
type: story
title: Pay with crypto (USDT)
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

- [ ] Given a user chooses a plan and crypto, Then they see an invoice with amount, network, address/QR and expiry
- [ ] Given the gateway confirms full payment (sandbox or fake callback), Then the plan is active for 30 days and its credits are added once
- [ ] Given an underpaid or expired invoice, Then the plan is not activated and the invoice shows its status
- [ ] Given a callback with an invalid signature or a repeated callback, Then it is rejected or ignored without adding credits twice

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
