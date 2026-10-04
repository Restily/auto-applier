---
id: S-001
type: story
title: "Sign up, sign in, sign out and password reset with free credits"
status: qa
milestone: M1
owner: frontend-dev
priority: P0
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-27
updated: 2026-10-04
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [x] Given a visitor on the sign-up page, When they submit a valid email and a password of at least 8 characters, Then an account is created, they are signed in, land on the onboarding checklist and see a credit balance of 20
- [x] Given the email is already registered, When a visitor signs up with it, Then no second account is created and a neutral message suggests signing in or resetting the password
- [x] Given a malformed email or a password shorter than 8 characters, When the form is submitted, Then field-level errors are shown and no account is created
- [x] Given a registered user, When they sign in with a wrong password or an unknown email, Then the same generic 'invalid email or password' error is shown
- [x] Given a user requests a password reset, When they open the emailed link (local mail catcher) and set a new password, Then they can sign in with the new password and not with the old one; an expired or reused link is rejected
- [x] Given a signed-in user, When they sign out, Then protected pages redirect to sign-in
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
- 2026-09-28 09:18 note (designer): D5 copy confirmed: welcome toast (auth.signUp.welcomeToast) shows only when ShellData.signupBonusGranted; no toast, no substitute message when it's false — header balance badge just shows 0 with the same neutral styling as any other value. See docs/design/screens/S-001.md States/Success + Copy.
- 2026-09-28 09:18 note (qa-automation): QA delta contract review (2026-09-28): AC7 amended wording (D5) verified — 3 test layers + control case, no gaps. See docs/qa/plans/M1-test-plan.md.
- 2026-10-04 18:34 todo → qa (team-lead)
- 2026-10-04 18:42 AC 1 ✔ (qa-manual): docs/qa/evidence/M1/S-001-ac1-en-1280.png, S-001-ac1-ru-375.png, S-001-ac1-en-375.png; ledger=1 signup_grant 20
- 2026-10-04 18:42 AC 2 ✔ (qa-manual): docs/qa/evidence/M1/S-001-ac2-en-1280.png, S-001-ac2-ru-375.png; users with email=1
- 2026-10-04 18:42 AC 3 ✔ (qa-manual): docs/qa/evidence/M1/S-001-ac3-en-1280.png, S-001-ac3-ru-375.png; no auth.users row
- 2026-10-04 18:42 AC 4 ✔ (qa-manual): docs/qa/evidence/M1/S-001-ac4-wrongpw-en-1280.png, S-001-ac4-unknown-en-1280.png, S-001-ac4-en-375.png
- 2026-10-04 18:42 AC 5 ✔ (qa-manual): docs/qa/evidence/M1/S-001-ac5-*.png: reset via Mailpit, old pw rejected, new works, reused + backdated (3h) links -> expired panel EN/RU
- 2026-10-04 18:42 AC 6 ✔ (qa-manual): docs/qa/evidence/M1/S-001-ac6-en-1280.png: /profile,/settings,/onboarding redirect to /sign-in?next=
