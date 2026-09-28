# ADR-0005: Chrome extension (MV3) architecture, pairing and task protocol

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
LinkedIn works only through the user's own Chrome session (PRD): the extension collects LinkedIn Jobs and hiring posts and runs Easy Apply while Chrome is open. It must pair with the user's account, hold a scoped, revocable token, fetch work from the platform and report results. The platform never sends LinkedIn messages. Built in M4; this ADR fixes the architecture now so M1–M3 data models fit.

## Options considered
Build tooling: 1. **WXT** (MIT, Vite-based MV3 framework: manifest generation, service worker + content scripts + popup entrypoints, typed `browser` API, dev reload). 2. Plain Vite + hand-written manifest. 3. Plasmo (heavier, less active).
Pairing: A. **Web-initiated one-time code handed to the extension via `externally_connectable` messaging**, with manual code entry as fallback. B. Extension reads the web app's Supabase session cookie (couples extension to web auth internals; the extension would hold a full user JWT). C. OAuth device flow (more moving parts for the same result).
Task delivery: I. **Polling with `chrome.alarms`** from the MV3 service worker. II. WebSocket/SSE (MV3 service workers are suspended; connections drop). III. Push (needs Web Push/FCM — extra infra).

## Decision
- **`apps/extension`**: TypeScript, **WXT**, Manifest V3, Chrome/Chromium desktop only, UI (popup/options) with the same tokens and React; `chrome.i18n` `_locales/en|ru`. Tested with Vitest (unit) and Playwright loading the unpacked build into Chromium against **fixture LinkedIn pages** served locally (ADR-0007).
- **Components:** background **service worker** (only holder of the token; talks to the API), **content scripts** on `linkedin.com` (DOM reading and Easy Apply form filling; message the service worker, never the API), **popup** (pairing status, active/paused, today's counters), **options** (manual pairing code, unpair).
- **Pairing (A):** the signed-in user opens `/extension/connect` in the web app → the web calls `POST /v1/extension/pairings` → the API returns a one-time **pairing code** (random, 10-minute TTL, single use, stored hashed) → the page sends `{code}` to the extension via `chrome.runtime.sendMessage(EXTENSION_ID, …)` (`externally_connectable.matches` = the app origin) or the user types it in the options page → the extension calls `POST /ext/v1/pair` with the code and its generated `installation_id` → the API returns an **extension token** once.
- **Extension token:** opaque 256-bit random string, prefix `aaext_`, stored **only as a SHA-256 hash** in `public.extension_devices` (user_id, installation_id, token_hash, scopes, created_at, last_seen_at, revoked_at, expires_at = +90 days). Scopes: `tasks:read`, `tasks:report`, `vacancies:write`, `heartbeat`. Kept in `chrome.storage.local` (never `sync`, never exposed to content scripts or pages). Revocable from web settings and by account deletion; every `/ext/v1` call checks hash, scope, expiry and revocation.
- **Protocol (I):** `chrome.alarms` every 1 min → `POST /ext/v1/heartbeat` (marks the LinkedIn channel active; pending LinkedIn tasks wait while inactive) and `POST /ext/v1/tasks/claim` → tasks `{id, kind: collect_jobs|collect_posts|easy_apply, payload, lease_expires_at}` leased for 5 min (re-queued if not reported). Results: `POST /ext/v1/tasks/{id}/result` with an `Idempotency-Key` (`sent|failed|skipped`, error code, evidence); collected items: `POST /ext/v1/vacancies:batch`. The server decides limits, pacing windows and dedupe; the extension only executes. Collection cadence (Jobs hourly, posts every 2 h) is enforced server-side by what `claim` returns.
- **CORS:** `/ext/v1/*` allows only the configured extension origin(s) (`chrome-extension://<id>`).

## Consequences
- Positive: the token is scoped and useless outside `/ext/v1`; hashing is stronger than the PRD's "encrypted at rest" for this secret; MV3 suspension is tolerated by polling; server-side limits keep all safety rules in one place.
- Negative: up to ~1 min latency for LinkedIn tasks (acceptable: 5-min SLA); fixture pages must be kept close to real LinkedIn markup (human live checklist before launch).
- Follow-ups: M4 plan defines the exact `/ext/v1` schemas in OpenAPI and a fixture LinkedIn site under `tests/fixtures/linkedin/`.
