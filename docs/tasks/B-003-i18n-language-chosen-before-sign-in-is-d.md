---
id: B-003
type: bug
title: "i18n: language chosen before sign-in is discarded and the account's stored language wins [S-005 AC2]"
status: todo
milestone: M1
owner: frontend-dev
priority: P1
severity: low
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## Description

## Steps to reproduce
1. Have an account whose profile language is English (profiles.ui_locale = 'en').
2. As a signed-out visitor open http://localhost:3000/sign-in and choose "Русский" in the header language menu (page turns Russian, NEXT_LOCALE=ru cookie set).
3. Sign in with that account (Войти).

## Expected
S-005 AC2: a user's language switch persists ("the choice persists across sessions"). After signing in the UI should still be Russian (and ideally the profile adopts the explicit choice made in this browser).

## Actual
After sign-in the interface is English (<html lang="en">): signInAction runs copyProfileLocaleToCookie, which overwrites the NEXT_LOCALE cookie with profiles.ui_locale, and the request-config order (ADR-0015) puts the profile first. The visitor's explicit choice is silently lost.

## Notes
Severity low: arguably "account setting wins" is a defensible reading of the AC; filed because the lead asked to assert the AC text. Needs a product decision (human/architect) if the current behavior is intended; if so, mark wontfix and amend the test.

## Evidence
- tests/e2e/i18n/locale.spec.ts "a language chosen before sign-in is not lost when the account has another one" (test.fixme with this bug id)

## Environment
http://localhost:3000, chromium desktop, throwaway qa+<uuid>@example.test account.

## Steps to reproduce

1. …

## Expected

…

## Actual

…

## Evidence

- docs/qa/evidence/…

## Acceptance criteria

- [ ] Regression test added that failed before the fix
- [ ] Fix verified by QA

## Log

- 2026-10-04 11:58 created (qa-automation)
