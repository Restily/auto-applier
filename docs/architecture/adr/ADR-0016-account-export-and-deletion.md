# ADR-0016: Account data export and deletion with enforced table coverage

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
S-006 and the PRD require:
- a JSON export of the profile, searches, applications and the credit ledger;
- a real deletion of the account, profile, resume files, searches, connections and all stored secrets, after which the user is signed out and the old credentials no longer work.

M1 has only some of these tables. M2–M4 add searches, applications, connections, `private.user_secrets` and extension devices. The risk is that a later milestone adds a user-owned table and forgets to export or delete it.

## Options considered
1. **Python API commands with a registry of export sections and purge steps, plus integration tests that enumerate every table referencing `auth.users` and fail if one is not covered.**
2. Export and delete from Next.js with supabase-js: no service key in the web (ADR-0004), no Storage/Auth admin access, secrets unreachable by design (ADR-0008).
3. A `SECURITY DEFINER` SQL function per operation: Storage objects and the Auth user can't be removed from SQL safely.

## Decision
- `GET /v1/account/export` returns `AccountExport` JSON with `Content-Disposition: attachment; filename="autoapplier-export-<YYYY-MM-DD>.json"`. It reads through `as_user` (RLS applies), so it can only ever contain the caller's rows. Sections come from `EXPORT_SECTIONS` in `autoapplier/services/account_export.py`. `searches` and `applications` are always present, as empty lists until their tables exist.
- `POST /v1/account/deletion` with body `{"confirm_email": str}`. The email is compared, trimmed and case-insensitively, with the verified JWT's `email` claim; a mismatch returns 422 `account.confirmation_mismatch` and nothing happens. Then it runs, in order:
  1. every `AccountPurgeStep` in `PURGE_STEPS` (M1: remove all Storage objects under `resumes/<user_id>/`; M3/M4 add secrets and connections);
  2. `AuthAdmin.delete_user(user_id)` (GoTrue admin API, secret key). This cascades every `public` and `private` row through `on delete cascade` and revokes refresh tokens.
  Each step is idempotent, so a failed deletion can be retried safely. Any failure returns 502 `account.delete_failed` with the account still present.
- Coverage is enforced by integration tests. They list every table with a foreign key to `auth.users` (via `pg_constraint`):
  - every such table must be an `EXPORT_SECTIONS` source or in `EXPORT_EXCLUDED` with a reason;
  - it must cascade on delete;
  - after a deletion, the table must have zero rows for the user.
  A new user-owned table therefore fails the build until export and deletion handle it.
- The web signs the session out locally after a 204 and shows `/account-deleted`.

## Consequences
- Positive: one place per concern; later milestones extend registries instead of rewriting flows; the tests make a forgotten table impossible to ship silently.
- Negative: an access token issued before deletion stays cryptographically valid until it expires (≤ 1 h). It can't refresh, and RLS finds no rows for it. Accepted for MVP; the MR security audit re-checks it.
