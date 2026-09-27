# ADR-0010: Internationalization (EN/RU)

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
UI in English and Russian: browser default, switchable, persisted; no hard-coded UI strings. Cover letters in the vacancy's language (LLM concern, not UI i18n). Emails (credit/notification) in the user's UI language. The extension UI in EN/RU. Implementation belongs to M1 (S-005); M0 fixes the approach.

## Options considered
1. **next-intl** (MIT) for the App Router, **without locale-prefixed routes** (locale from a cookie/profile), ICU messages in JSON.
2. next-intl with `/en`, `/ru` route prefixes: SEO-friendly, but the app is behind sign-in and prefixes complicate every link and test.
3. i18next + react-i18next: mature, but less integrated with server components.

## Decision
- **next-intl, "without i18n routing" setup.** Locale resolution in `apps/web/src/i18n/request.ts`: `NEXT_LOCALE` cookie → `profiles.ui_locale` (after sign-in, synced into the cookie) → `Accept-Language` best match → `en`. Supported locales: `en`, `ru` (constant in `apps/web/src/i18n/config.ts`).
- Messages: `apps/web/messages/en.json`, `apps/web/messages/ru.json`, namespaced by feature (`auth.*`, `profile.*`, `health.*`…), ICU plurals (Russian plural forms). A unit test asserts both files have identical key sets.
- **No hard-coded UI strings:** ESLint `eslint-plugin-i18next` rule `no-literal-string` (mode `jsx-text-only`) on `apps/web/src/**/*.tsx` from M1; error message tells the agent to add a key to `messages/*.json`.
- API errors carry stable `code`s (ADR-0004) mapped to messages in the web; the backend never returns user-facing prose for the UI.
- Backend emails: Python JSON catalogs `backend/src/autoapplier/i18n/{en,ru}.json` with the same key-parity test.
- Extension: `chrome.i18n` with `_locales/en|ru/messages.json`, following the user's UI locale received at pairing.
- Dates/numbers: `Intl` via next-intl formatters; stored times are UTC.

## Consequences
- Positive: server-component friendly, clean URLs, one message format.
- Negative: M0 pages (the health page) use literal English strings until M1 wires next-intl (TECH-DEBT TD-001).
