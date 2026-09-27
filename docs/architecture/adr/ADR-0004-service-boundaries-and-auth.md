# ADR-0004: Service boundaries, API style and authentication

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
Three runtimes touch data: the Next.js web app, the Python API/worker, and (from M4) the Chrome extension. Supabase provides Auth (email/password, Google) and RLS. User secrets must never reach the browser. We need a rule for which runtime owns which reads/writes so that business rules are not duplicated.

## Options considered
1. **Browser → Next.js only; Next.js server → Supabase (RLS) for plain user-owned CRUD and → Python API for business commands.** The extension and webhooks call the Python API directly.
2. Browser calls the Python API directly (CORS, token in the browser for every call); Next.js is a pure UI.
3. Everything through the Python API, Supabase only as a database.

## Decision (option 1)
- **Browser talks only to Next.js** (same origin). The Python API binds to `127.0.0.1:8000` and is called **server-side** from Next.js server components, server actions and route handlers through `apps/web/src/lib/api/client.ts` (`openapi-fetch`), forwarding the user's Supabase access token as `Authorization: Bearer`.
- **Next.js → Supabase directly** (via `@supabase/ssr`, user session, RLS) only for **plain user-owned CRUD with no business rule** (e.g. profile fields, saved-search filters, UI locale). Anything that involves credits, limits, sending, the LLM, the queue, secrets, payments or cross-user data goes to the **Python API**. Validation that both paths share is expressed as DB constraints.
- **Python API style:** REST + JSON, versioned prefixes: `/v1/*` (web, user JWT), `/ext/v1/*` (extension, extension token — ADR-0005), `/webhooks/*` (Stripe, crypto gateway, Telegram bot — signature-verified), `/health` (unauthenticated, no secrets). OpenAPI is exported to `backend/openapi.json` and drives the web types.
- **Errors:** RFC 9457 problem details (`application/problem+json`) with `type`, `title`, `status`, `detail` and a stable machine `code` (e.g. `credits.insufficient`) that the web maps to localized messages. Validation errors → 422 with field paths. Commands that spend credits or send accept an `Idempotency-Key` header.
- **Authentication:** Supabase Auth issues JWTs. The Python API verifies them with **PyJWT** against the local Auth JWKS (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`, cached), falling back to the HS256 `SUPABASE_JWT_SECRET` if the local stack issues symmetric tokens. `aud=authenticated`, `exp` enforced.
- **Authorization:** the API runs user-scoped SQL inside a transaction that does `SET LOCAL ROLE authenticated` and `set_config('request.jwt.claims', <claims>, true)`, so **RLS applies to the backend too**. System jobs (worker, webhooks) use the service connection and must pass explicit `user_id` filters (reviewed in code review and covered by integration tests).
- **Operator role:** a `public.user_roles(user_id, role)` table (RLS: users read their own row; no self-writes) and a SQL helper `internal.is_operator()` used in policies and by the API.

## Consequences
- Positive: no CORS for the web app, API URL and tokens stay server-side, RLS is the last line of defense for both runtimes.
- Negative: two write paths (supabase-js and API) — mitigated by the rule above and DB constraints; server-to-server hop adds latency (localhost, negligible).
- Follow-ups: M1 implements JWT verification and the `as_user` transaction helper; the security audit (MR) checks every `/v1` route for user scoping.
