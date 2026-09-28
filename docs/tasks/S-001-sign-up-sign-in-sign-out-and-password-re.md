---
id: S-001
type: story
title: "Sign up, sign in, sign out and password reset with free credits"
status: todo
milestone: M1
owner: frontend-dev
priority: P0
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-27
updated: 2026-09-28
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a visitor on the sign-up page, When they submit a valid email and a password of at least 8 characters, Then an account is created, they are signed in, land on the onboarding checklist and see a credit balance of 20
- [ ] Given the email is already registered, When a visitor signs up with it, Then no second account is created and a neutral message suggests signing in or resetting the password
- [ ] Given a malformed email or a password shorter than 8 characters, When the form is submitted, Then field-level errors are shown and no account is created
- [ ] Given a registered user, When they sign in with a wrong password or an unknown email, Then the same generic 'invalid email or password' error is shown
- [ ] Given a user requests a password reset, When they open the emailed link (local mail catcher) and set a new password, Then they can sign in with the new password and not with the old one; an expired or reused link is rejected
- [ ] Given a signed-in user, When they sign out, Then protected pages redirect to sign-in
- [ ] Given any user, Then the credit ledger contains exactly one 'sign-up bonus' entry of 20 credits, and signing in again never grants more

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 15:00 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (team-lead)
- 2026-09-28 08:58 note (team-lead): D5: sign-up bonus is skipped when the email's HMAC fingerprint exists from a deleted account (see PRD decision log 2026-09-28).
- 2026-09-28 09:15 note (architect): Architect (plan amended for D5): AC7 text predates D5 — lead please reword to: exactly one 20-credit sign-up bonus per account, except an account re-created with the email of a deleted account, which gets none; signing in again never grants more. Plan traceability row S-001·7 covers both.
- 2026-09-28 09:16 note (team-lead): AC7 amended by human decision D5 (2026-09-28): 'exactly one sign-up bonus per user' now reads 'exactly one sign-up-bonus entry of 20 credits, unless the email's HMAC fingerprint exists from a deleted account — then none; signing in again never grants more'. QA verifies AC7 against this wording.
