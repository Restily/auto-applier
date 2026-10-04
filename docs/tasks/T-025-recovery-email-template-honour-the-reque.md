---
id: T-025
type: task
title: "Recovery email template: honour the request-time language marker (B-002)"
status: done
milestone: M1
owner: backend-dev
priority: P1
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## What to do

B-002 frontend half is done: requestPasswordResetAction now calls resetPasswordForEmail(email, { redirectTo: `${APP_ORIGIN}/reset-password?lang=<en|ru>` }) whenever the visitor has a NEXT_LOCALE cookie (explicit/synced choice). A signed-out visitor has no way to update auth user_metadata (the profiles->auth.locale DB trigger only covers signed-in switches), so the template must read the marker. GoTrue exposes .RedirectTo and .SiteURL to the recovery template; text/template builtins `print`, `eq`, `or`, `and` suffice (no custom funcs needed). Suggested condition (env independent):

  {{ $ru := print .SiteURL "/reset-password?lang=ru" }}{{ $en := print .SiteURL "/reset-password?lang=en" }}
  {{ if or (eq .RedirectTo $ru) (and (ne .RedirectTo $en) (eq .Data.locale "ru")) }} ...Russian... {{ else }} ...English... {{ end }}

Verify the redirect allowlist (additional_redirect_urls http://localhost:3000/**) accepts the query string, and that the existing control (account created from a ru browser, no marker) still gets Russian. Then B-002 e2e in tests/e2e/i18n/locale.spec.ts can drop its test.fixme.

## Definition of done

- [x] supabase/templates/recovery.html picks Russian when .RedirectTo equals SiteURL+/reset-password?lang=ru, English when ?lang=en, else falls back to .Data.locale; local Mailpit check for all three; B-002 e2e (fixme removed) passes

## Log

- 2026-10-04 12:07 created (frontend-dev)
- 2026-10-04 12:12 todo → in_progress (team-lead)
- 2026-10-04 12:16 AC 1 ✔ (backend-dev): backend/tests/integration/test_auth_gotrue.py::test_recovery_email_* (ru/en marker, metadata fallback; Mailpit); e2e fixme removal is qa-automation's
- 2026-10-04 12:16 in_progress → qa (backend-dev): recovery.html branches on .RedirectTo ?lang= marker; auth container restarted only; uncommitted
- 2026-10-04 12:17 qa → done (team-lead)
