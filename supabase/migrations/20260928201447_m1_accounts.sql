-- M1 accounts: profiles, credit ledger, sign-up trigger, locale sync, and the D5
-- no-repeat-bonus fingerprint (ADR-0013 amendment).

-- Generic updated_at trigger ---------------------------------------------------------------
create or replace function internal.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- D5: private schema, fingerprint table, Vault key ---------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table private.deleted_account_fingerprints (
  email_hmac bytea primary key check (octet_length(email_hmac) = 32)
);
alter table private.deleted_account_fingerprints enable row level security;
revoke all on private.deleted_account_fingerprints from public, anon, authenticated, service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'signup_bonus_fingerprint_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'signup_bonus_fingerprint_key',
      'HMAC key for private.deleted_account_fingerprints (D5, ADR-0013)'
    );
  end if;
end;
$$;

create or replace function internal.email_fingerprint(email text)
returns bytea
language plpgsql
stable
strict
security definer
set search_path = ''
as $$
declare
  key_hex text;
begin
  select decrypted_secret into key_hex
  from vault.decrypted_secrets
  where name = 'signup_bonus_fingerprint_key';
  if key_hex is null then
    raise exception 'signup_bonus_fingerprint_key is missing from Vault';
  end if;
  return extensions.hmac(
    pg_catalog.convert_to(pg_catalog.lower(pg_catalog.btrim(email, E' \t\r\n')), 'UTF8'),
    pg_catalog.decode(key_hex, 'hex'),
    'sha256'
  );
end;
$$;
revoke execute on function internal.email_fingerprint(text) from public, anon, authenticated, service_role;

create or replace function internal.record_deleted_account_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email is not null then
    insert into private.deleted_account_fingerprints (email_hmac)
    values (internal.email_fingerprint(old.email))
    on conflict do nothing;
  end if;
  return old;
end;
$$;
revoke execute on function internal.record_deleted_account_fingerprint() from public, anon, authenticated;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function internal.record_deleted_account_fingerprint();

-- profiles ---------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  ui_locale text not null default 'en' check (ui_locale in ('en', 'ru')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on public.profiles from anon, authenticated;
grant select, update (ui_locale) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function internal.touch_updated_at();

-- credit ledger --------------------------------------------------------------------------------------
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in (
    'signup_grant', 'plan_grant', 'application_sent', 'send_refund', 'period_expiry', 'operator_adjustment')),
  ref_type text not null,
  ref_id text not null,
  created_at timestamptz not null default now(),
  unique (reason, ref_type, ref_id)
);
create index credit_ledger_user_created_idx on public.credit_ledger (user_id, created_at desc);

revoke all on public.credit_ledger from anon, authenticated;
grant select on public.credit_ledger to authenticated;

create policy credit_ledger_select_own on public.credit_ledger
  for select to authenticated using (user_id = (select auth.uid()));

create view public.credit_balances with (security_invoker = true) as
  select user_id, sum(delta)::integer as balance
  from public.credit_ledger
  group by user_id;

revoke all on public.credit_balances from anon, authenticated;
grant select on public.credit_balances to authenticated;

-- sign-up trigger ----------------------------------------------------------------------------------------
create or replace function internal.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_locale text := new.raw_user_meta_data ->> 'locale';
begin
  insert into public.profiles (id, ui_locale)
  values (new.id, case when requested_locale in ('en', 'ru') then requested_locale else 'en' end)
  on conflict do nothing;

  if new.email is null or not exists (
    select 1 from private.deleted_account_fingerprints
    where email_hmac = internal.email_fingerprint(new.email)
  ) then
    insert into public.credit_ledger (user_id, delta, reason, ref_type, ref_id)
    values (new.id, 20, 'signup_grant', 'auth_user', new.id::text)
    on conflict (reason, ref_type, ref_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function internal.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function internal.handle_new_user();

-- ui_locale -> auth metadata (so GoTrue email templates can branch on .Data.locale) ------------------
create or replace function internal.sync_profile_locale()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('locale', new.ui_locale)
  where id = new.id;
  return new;
end;
$$;
revoke execute on function internal.sync_profile_locale() from public, anon, authenticated;

create trigger profiles_sync_locale
  after update of ui_locale on public.profiles
  for each row execute function internal.sync_profile_locale();

-- backfill (idempotent) ----------------------------------------------------------------------------------------
insert into public.profiles (id, ui_locale)
select u.id, case when u.raw_user_meta_data ->> 'locale' in ('en', 'ru') then u.raw_user_meta_data ->> 'locale' else 'en' end
from auth.users u
on conflict do nothing;

insert into public.credit_ledger (user_id, delta, reason, ref_type, ref_id)
select u.id, 20, 'signup_grant', 'auth_user', u.id::text
from auth.users u
where u.email is null
   or not exists (
     select 1 from private.deleted_account_fingerprints f
     where f.email_hmac = internal.email_fingerprint(u.email))
on conflict (reason, ref_type, ref_id) do nothing;
