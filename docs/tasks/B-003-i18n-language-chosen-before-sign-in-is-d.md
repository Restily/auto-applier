---
id: B-003
type: bug
title: "i18n: language chosen before sign-in is discarded and the account's stored language wins [S-005 AC2]"
status: done
milestone: M1
owner: frontend-dev
priority: P1
severity: medium
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

- [x] Regression test added that failed before the fix
- [x] Fix verified by QA

## Log

- 2026-10-04 11:58 created (qa-automation)
- 2026-10-04 12:05 set severity=medium (team-lead)
- 2026-10-04 12:05 note (team-lead): lead decision: S-005 spec §Global language behavior says a deliberate pre-signup (signed-out) choice becomes the stored preference at sign-up/in — so an explicitly chosen locale (NEXT_LOCALE cookie set by the switcher) must be written to profiles.ui_locale on sign-in; Accept-Language-derived defaults must not override the stored profile value.
- 2026-10-04 12:12 todo → in_progress (frontend-dev)
- 2026-10-04 12:12 AC 1 ✔ (frontend-dev): apps/web/src/lib/auth/actions.test.ts + src/i18n/actions.test.ts (B-003 cases; failed before); scratch e2e of locale.spec.ts 'language precedence' passes
- 2026-10-04 12:12 in_progress → qa (frontend-dev): Root cause: signInAction/OAuth copied profiles.ui_locale over NEXT_LOCALE and nothing distinguished a deliberate signed-out choice. Fix: setLocale (signed out) also sets httpOnly NEXT_LOCALE_PENDING; sign-in/OAuth adopt it into profiles.ui_locale (DB trigger mirrors to auth locale), else profile wins; sign-up drops it. Accept-Language never overrides.
- 2026-10-04 18:53 AC 2 ✔ (qa-manual): docs/qa/evidence/M1/B-003-ru-after-signin-1280.png: RU chosen before sign-in survives sign-in on en-profile account; profile adopts ru; fresh browser shows account language (S-005-ac2-cross-device-ru-1280.png)
- 2026-10-04 18:54 qa → done (qa-manual)
