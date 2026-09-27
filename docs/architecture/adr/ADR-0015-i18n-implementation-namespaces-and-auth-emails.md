# ADR-0015: i18n implementation details — namespace catalogs, signed-in locale source, localized Auth emails

- Status: accepted — amends ADR-0010 (message file layout, locale resolution order)
- Date: 2026-09-27
- Deciders: architect

## Context
ADR-0010 chose next-intl without locale routing, with one `messages/en.json` and one `messages/ru.json`, and resolution order cookie → `profiles.ui_locale` → `Accept-Language` → `en`. Three things surfaced while planning M1:
1. Parallel implementer waves edit messages for different features at the same time, and one JSON file per locale would conflict on every merge.
2. S-005 AC2 wants the choice to persist "across devices" for signed-in users. With cookie-first resolution, a stale cookie on device A overrides a newer choice made on device B.
3. The Auth emails (password reset) are rendered by Supabase Auth (GoTrue), not by our code, but they must be in the user's language.

## Options considered
Catalog layout: one file per locale (conflicts) vs **one file per namespace per locale** (`messages/<locale>/<namespace>.json`).
Signed-in locale: cookie-first (ADR-0010) vs **profile-first when signed in**.
Auth email language: A. **One GoTrue template per email type with a Go-template branch on the user's metadata** (`{{ if eq .Data.locale "ru" }}…{{ else }}…{{ end }}`), and `profiles.ui_locale` mirrored into `raw_user_meta_data.locale` by a trigger (ADR-0013). B. A GoTrue "send email" hook to the Python API that renders our own catalogs: another endpoint, a signature secret and a mail adapter in M1 just for one email.

## Decision
- Catalogs: `apps/web/messages/<en|ru>/<namespace>.json`. M1 namespaces are `common`, `shell`, `validation`, `auth`, `onboarding`, `profile`, `resume`, `settings`, `account`, `health`. The i18n platform task creates all of them (empty `{}` where not yet used) and a single loader `apps/web/src/i18n/messages.ts`, so feature tasks only edit their own namespace files. Keys are nested by namespace (`t("auth.signUp.heading")`).
- Missing keys fall back silently to English: the loader deep-merges `en` under the requested locale, and `getMessageFallback` never renders the raw key. Missing keys are caught before shipping by the key-parity unit test and by e2e checks for `MISSING_MESSAGE` and key-shaped text (S-005 AC3).
- Locale resolution (`apps/web/src/i18n/request.ts`):
  1. signed in → `profiles.ui_locale`;
  2. else the `NEXT_LOCALE` cookie (set only by an explicit switch);
  3. else the best `Accept-Language` match (Russian iff the highest-preference language is `ru` or `ru-*`);
  4. else `en`.
  A switch writes the cookie and, when signed in, `profiles.ui_locale`. Sign-up passes the current locale as `options.data.locale` (ADR-0013). Sign-in overwrites the cookie with the profile value.
- Validation messages are i18n keys (`validation.required`, `validation.email`, …) carried by zod issues and translated at render time. The server never returns user-facing prose (ADR-0010).
- Auth emails (option A): `supabase/templates/recovery.html`, configured in `supabase/config.toml` under `[auth.email.template.recovery]`. The link is `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`. The subject is bilingual if GoTrue doesn't render template syntax in subjects.
- The Python catalogs `backend/src/autoapplier/i18n/{en,ru}.json` from ADR-0010 are created when the backend sends its first email (M5), not in M1.

## Consequences
- Positive: parallel tasks don't collide on catalogs; the locale follows the account across devices; reset emails are localized with no extra service.
- Negative: one extra `profiles` read per request for signed-in users (shared with the shell layout via React `cache`); Auth email copy lives in an HTML template outside `messages/`, so the key-parity test does not cover it. An integration test checks both branches instead.
