# ADR-0013: Account provisioning and the sign-up credit grant via an `auth.users` trigger

- Status: accepted (amended 2026-09-28 for D5)
- Date: 2026-09-27
- Deciders: architect

## Context
Every new account, whether created with email/password (S-001) or Google (S-002), must get a `profiles` row (UI locale, onboarding state) and exactly one 20-credit sign-up grant (PRD: "20 free credits at sign-up, granted once"; S-001 AC7, S-002 AC1). Supabase Auth (GoTrue) creates the `auth.users` row; our code never sees an "account created" event of its own. Signing in again, or Google linking to an existing email account, must never grant again. ADR-0009 fixed the ledger shape: append-only `credit_ledger` with `unique (reason, ref_type, ref_id)`; users read their own rows, only the backend writes.

## Options considered
1. **`after insert` trigger on `auth.users`** (`SECURITY DEFINER`, in schema `internal`) that inserts the `profiles` row and the `signup_grant` ledger row in the same transaction as the user. `on conflict do nothing` on the unique key.
2. The web app calls a Python API endpoint (`POST /v1/account/provision`) after sign-up and after every OAuth callback. Two calls to lose, a window where the account exists without a profile, and every entry path must remember to call it.
3. GoTrue "send webhook"/auth hooks to the Python API: extra moving part in local dev; the hook must be idempotent anyway.

## Decision
- Option 1. Migration `…_m1_accounts.sql` defines `internal.handle_new_user()` (`security definer`, `set search_path = ''`) and `create trigger on_auth_user_created after insert on auth.users for each row execute function internal.handle_new_user()`.
- It inserts `public.profiles(id, ui_locale)` with `ui_locale` from `new.raw_user_meta_data->>'locale'` when it is `en` or `ru`, else `en`. The web passes the visitor's current locale as sign-up metadata, so a deliberate pre-sign-up language choice survives (S-005).
- It inserts `public.credit_ledger(user_id, delta, reason, ref_type, ref_id)` = `(new.id, 20, 'signup_grant', 'auth_user', new.id::text)` with `on conflict (reason, ref_type, ref_id) do nothing`. The amount is the constant `20` in the migration. Changing it is a human decision (AUTONOMY), done in a new migration.
- Both inserts are also run once as a backfill for any existing `auth.users` rows (idempotent).
- A second trigger, `internal.sync_profile_locale()` (`after update of ui_locale on public.profiles`), mirrors `ui_locale` into `auth.users.raw_user_meta_data.locale`, so Auth email templates can render in the user's language (ADR-0015).
- The balance is the view `public.credit_balances` (`with (security_invoker = true)`, `sum(delta)` per user), so RLS on `credit_ledger` applies to it.

## Consequences
- Positive: one code path for every sign-up method; the grant is atomic with account creation and idempotent by constraint; no network hop.
- Negative: business logic in a DB trigger. It is small, covered by pgTAP and by real sign-ups through GoTrue. If GoTrue's role (`supabase_auth_admin`) lacks a privilege the trigger needs, sign-up fails loudly with a 500 (caught by the M1 integration tests).
- ~~Open question for the product owner: re-sign-up after deletion grants 20 credits again.~~ Resolved by the human (D5, 2026-09-28); see the amendment below.

## Amendment 2026-09-28 — D5: no repeat sign-up bonus after account deletion

**Context.** The human decided (PRD decision log, 2026-09-28) that an account re-created with the email of a deleted account gets no sign-up bonus. After deletion only a keyed hash of the normalized email may be kept, used for nothing else, and disclosed in the privacy policy.

**Options considered.**
1. **All in Postgres:** an `after delete` trigger on `auth.users` stores the HMAC; `handle_new_user()` checks it. The HMAC key is a Supabase Vault secret read only by `SECURITY DEFINER` functions.
2. The Python API computes the HMAC with an env-var key at deletion, and the grant moves out of the trigger into an API call after sign-up. This brings back every drawback of option 2 in the original decision, and GoTrue's public sign-up endpoint would bypass it.
3. Grant as today, then claw back with a negative ledger entry. The ledger would show a bonus the user never had, and "exactly one sign-up bonus" would read wrong.

**Decision.** Option 1.
- `private.deleted_account_fingerprints(email_hmac bytea primary key, octet_length = 32)` is the only column. Schema `private` has no `USAGE` for `anon`/`authenticated`. The table has RLS on, no policies, and no privileges for `anon`, `authenticated` or `service_role`.
- `internal.email_fingerprint(text) → bytea` = `extensions.hmac(lower(btrim(email)), key, 'sha256')`. The key is the Vault secret `signup_bonus_fingerprint_key`: 32 random bytes, created by the migration if absent, so it is never in git and differs per environment. A missing key raises, so D5 can't be skipped silently. `EXECUTE` is revoked from `public`, `anon`, `authenticated` and `service_role`.
- `internal.record_deleted_account_fingerprint()`, an `after delete on auth.users` trigger, inserts the fingerprint when `old.email` is not null (`on conflict do nothing`). It runs in the same transaction as the delete, so every deletion path records it, and a rolled-back deletion records nothing.
- `internal.handle_new_user()` still creates `profiles`, and inserts the `signup_grant` only when the new email's fingerprint is absent. A re-created account therefore has balance 0 and no ledger row.
- The table is used for nothing else. pgTAP asserts that only these two functions reference it and that no view does. The HMAC is never computed or seen outside SQL.
- Disclosure: the `/privacy` placeholder section "What we keep after you delete your account", linked from the delete dialog and the account-deleted page (M1 plan, Task 10).

**Consequences.**
- Positive: one enforcement point that the public GoTrue sign-up cannot bypass; atomic with both the deletion and the sign-up; no email kept in plaintext; a leaked table can't be reversed without the Vault key.
- Negative:
  - Every deleted user leaves one 32-byte row, including test users (their emails are unique).
  - Rotating the Vault key forgets all previous fingerprints. This is acceptable: the worst case is a repeat bonus.
  - The fingerprint covers the email held at deletion time only; an address changed before deletion is not recorded (TECH-DEBT TD-008; M1 has no email-change UI).
  - The key lives in Postgres (Vault) rather than in the API process. That is needed so the trigger can check it; Vault encrypts it at rest with a root key held outside the database tables.
