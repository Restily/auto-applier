# ADR-0016: Account data export and deletion with enforced table coverage

- Status: accepted (amended 2026-09-28 for D5)
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

## Amendment 2026-09-28 — D5: the one datum kept after deletion

- **What changes:** deleting the Auth user (step 2 above) now also writes one row to `private.deleted_account_fingerprints`: `HMAC-SHA256(Vault key, trim+lowercase(email))`. The `auth.users` delete trigger writes it in the same transaction (ADR-0013 amendment). The Python deletion flow is unchanged and never computes or sees the hash. If a purge step or the Auth delete fails, nothing is written.
- **What stays:** everything S-006 AC2 promises: the account, profile, resume files, searches, connections and all stored secrets are deleted, the session is signed out, and the old credentials fail. The fingerprint has no user id, no timestamp and no foreign key to `auth.users`. It is therefore outside the "user-owned tables" that the coverage tests enumerate, and it is never exported (it is not the user's data while the account exists, and it cannot be read back).
- **Disclosure:** the delete dialog and `/account-deleted` state it in one line and link to the `/privacy` section "What we keep after you delete your account".
- **Tests:** the M1 plan's Task 7 adds `test_deletion_keeps_only_email_fingerprint`, `test_failed_deletion_leaves_no_fingerprint` and `test_signup_after_deletion_gets_account_without_bonus`; Task 1 adds pgTAP §9; Task 13 adds the e2e re-sign-up journey.
