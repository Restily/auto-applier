---
id: S-022
type: story
title: Plans and Stripe subscription
status: todo
milestone: M5
owner: backend-dev
priority: P0
depends_on: [S-017]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a user opens Plans, Then Free (20 one-time credits), Basic ($15/month, 300 credits) and Pro ($29/month, 1000 credits) are shown in the chosen language
- [ ] Given the user completes Stripe Checkout (test mode or local mock), Then within 1 minute the plan is active and its credits are added with a ledger entry
- [ ] Given the checkout is cancelled or the payment fails, Then no plan is activated and no credits are added
- [ ] Given the same Stripe event is delivered twice or with an invalid signature, Then credits are added at most once and unsigned events are rejected
- [ ] Given a monthly renewal, Then unused plan credits expire and the new package is granted, both visible in the ledger
- [ ] Given the user cancels the subscription, Then the plan stays active until the period ends and is not renewed

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
