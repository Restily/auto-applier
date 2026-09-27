# ADR-0013: Account provisioning and the sign-up credit grant via an `auth.users` trigger

- Status: accepted
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
- Open question for the product owner: deleting an account and signing up again with the same email creates a new user and grants 20 credits again. Preventing that needs a retained email fingerprint after deletion, which conflicts with "all your data has been permanently removed". It is not implemented in M1; the lead escalates it.
