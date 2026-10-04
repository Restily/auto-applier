---
id: B-002
type: bug
title: "auth/forgot-password: reset email ignores the language the user switched to (uses sign-up-time locale only) [S-005 AC2]"
status: todo
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
1. As a visitor with an English browser, sign up a new account (or use any existing account created in English).
2. Sign out. Open http://localhost:3000/sign-in/forgot-password.
3. In the header language menu choose "Русский"; the page re-renders in Russian.
4. Enter the account email, press "Отправить инструкции" (UI shows "Проверьте почту").
5. Open Mailpit (http://127.0.0.1:54324) and read the reset email.

## Expected
S-005 AC2: "every page, validation message and email template uses the chosen language". The email is the Russian variant ("Восстановление пароля" / "Сменить пароль").

## Actual
The email is the English variant ("Reset your password" / "Reset password"). supabase/templates/recovery.html branches on `.Data.locale` (auth user_metadata, written only at sign-up by signUpAction); requestPasswordResetAction and setLocale never pass or update the currently chosen locale, so switching language later (anonymously or signed in) has no effect on the email language.

## Evidence
- Failing-by-design test (currently test.fixme with this bug id): tests/e2e/i18n/locale.spec.ts "reset email arrives in Russian after switching"
- Control that passes: a user who signed up with a Russian browser receives the Russian email (same file).

## Environment
http://localhost:3000, chromium desktop 1280x800, throwaway qa+<uuid>@example.test account, local Supabase + Mailpit.

## Suggested direction
Make the recovery email follow the locale in effect at request time (e.g. update user_metadata.locale in setLocale and sign-up/sign-in locale sync, or choose the template/locale at request time).

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
