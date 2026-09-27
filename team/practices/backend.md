# Backend best practices — what / how / where

Confirm every API and version with **context7** before you write it. Stack: TypeScript, Next.js Route Handlers / server actions, Supabase (Postgres, Auth, Storage). These are defaults — the ADRs in `docs/architecture/` win if they differ.

## Data & Postgres (where: `supabase/migrations/`, `src/lib/db/`)
- One concern per migration; never edit an applied migration — add a new one. Test locally with `supabase db reset`.
- Types: `text` over `varchar`; `timestamptz` (never `timestamp`); `numeric` for money, never float; `uuid` PKs (`gen_random_uuid()`); enums or check constraints for closed sets.
- Constraints in the DB, not just the app: `not null`, `unique`, FKs with explicit `on delete`, check constraints. Index FKs and every column you filter/sort on; add composite indexes for real query shapes.
- `created_at`/`updated_at timestamptz default now()`; keep money and quantities exact.
- After a schema change regenerate types (`supabase gen types typescript --local`) and use them everywhere.

## RLS & auth (where: every table, `src/lib/auth/`)
- Enable RLS on **every** table in `public` and write explicit policies — no table ships without them. Default deny; add least-privilege policies per role (anon/authenticated/owner).
- Never trust the client for identity: derive the user from the verified session on the server (`auth.uid()` in policies). The service-role key is server-only, never in client code or `NEXT_PUBLIC_*`.
- Test policies as anon, owner, and a *different* user (the IDOR case) — this is a required part of the task, not QA's job alone.

## API design (where: `src/app/api/`, server actions)
- Validate every input at the boundary with zod (or the project's validator); reject unknown fields; return typed, structured errors, never raw exceptions or stack traces.
- Correct status codes (400/401/403/404/409/422/500); idempotency for retryable writes; pagination on list endpoints (keyset over offset for large sets).
- No secrets in responses or logs; log with request context, not user PII. Keep handlers thin — business logic in `src/lib/`, unit-tested.

## Performance & safety
- Avoid N+1: batch/join in one query; select only needed columns. Wrap multi-write operations in a transaction.
- Set timeouts on outbound calls; make external calls cancellable; never block the request path on slow work that can be deferred.
- Concurrency: expect double-submits — use unique constraints / upserts, not read-then-write races.

## Testing (TDD — write the failing test first)
- Unit-test business logic in isolation (Vitest). Integration-test API + DB + RLS against local Supabase with unique data per test; never reset a shared DB mid-run. Hand e2e to qa-automation.
