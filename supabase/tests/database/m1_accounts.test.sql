-- pgTAP: M1 accounts, credit ledger, profile locale sync and the D5 email fingerprint.
--
-- Run with: bash scripts/supabase.sh test db
-- One transaction, rolled back at the end. Users are inserted into auth.users as postgres;
-- role switches act as a signed-in user.
begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

-- Fixtures (postgres) ----------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-4000-8000-000000000001', 'm1.ru@example.test', '{"locale":"ru"}'),
  ('a1000000-0000-4000-8000-000000000002', 'm1.de@example.test', '{"locale":"de"}'),
  ('a1000000-0000-4000-8000-00000000000a', 'm1.a@example.test', '{}'),
  ('a1000000-0000-4000-8000-00000000000b', 'm1.b@example.test', '{}');

-- 1. Locale from sign-up metadata --------------------------------------------------------------
select is((select ui_locale from public.profiles where id = 'a1000000-0000-4000-8000-000000000001'),
  'ru', 'sign-up with locale ru creates a ru profile');
select is((select ui_locale from public.profiles where id = 'a1000000-0000-4000-8000-000000000002'),
  'en', 'an unsupported locale falls back to en');

-- 2. One signup grant -------------------------------------------------------------------------
select is((select count(*)::int from public.credit_ledger
  where user_id = 'a1000000-0000-4000-8000-00000000000a'
    and delta = 20 and reason = 'signup_grant' and ref_type = 'auth_user'
    and ref_id = 'a1000000-0000-4000-8000-00000000000a'), 1, 'exactly one signup_grant of 20');
select is((select balance from public.credit_balances where user_id = 'a1000000-0000-4000-8000-00000000000a'),
  20, 'balance is 20');

-- 3. Sign-in grants nothing ---------------------------------------------------------------------
update auth.users set last_sign_in_at = now() where id = 'a1000000-0000-4000-8000-00000000000a';
select is((select count(*)::int from public.credit_ledger where user_id = 'a1000000-0000-4000-8000-00000000000a'),
  1, 'sign-in adds no ledger row');

-- 4. Identity linking grants nothing --------------------------------------------------------------
insert into auth.identities (provider_id, user_id, identity_data, provider)
values ('google-m1-a', 'a1000000-0000-4000-8000-00000000000a', '{"sub":"google-m1-a"}', 'google');
select is((select count(*)::int from public.credit_ledger where user_id = 'a1000000-0000-4000-8000-00000000000a'),
  1, 'linking an identity adds no ledger row');

-- 5. Duplicate grant --------------------------------------------------------------------------
select throws_ok($$
  insert into public.credit_ledger (user_id, delta, reason, ref_type, ref_id)
  values ('a1000000-0000-4000-8000-00000000000a', 20, 'signup_grant', 'auth_user', 'a1000000-0000-4000-8000-00000000000a')
$$, '23505', null, 'a duplicate signup_grant is rejected');

-- 6. Ledger is read-only for the owner ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-4000-8000-00000000000a', 'role', 'authenticated')::text, true);

select is((select count(*)::int from public.credit_ledger where user_id <> 'a1000000-0000-4000-8000-00000000000a'),
  0, 'user A sees no other ledger rows');
select is((select count(*)::int from public.credit_balances where user_id <> 'a1000000-0000-4000-8000-00000000000a'),
  0, 'user A sees no other balances');
select throws_ok($$ insert into public.credit_ledger (user_id, delta, reason, ref_type, ref_id)
  values ('a1000000-0000-4000-8000-00000000000a', 5, 'operator_adjustment', 'x', 'y') $$,
  '42501', null, 'owner cannot insert ledger rows');
select throws_ok($$ update public.credit_ledger set delta = 99 $$, '42501', null, 'owner cannot update ledger rows');
select throws_ok($$ delete from public.credit_ledger $$, '42501', null, 'owner cannot delete ledger rows');

-- 7. Profiles -----------------------------------------------------------------------------------
select lives_ok($$ update public.profiles set ui_locale = 'ru'
  where id = 'a1000000-0000-4000-8000-00000000000a' $$, 'owner updates own ui_locale');
reset role;
select is((select raw_user_meta_data ->> 'locale' from auth.users where id = 'a1000000-0000-4000-8000-00000000000a'),
  'ru', 'ui_locale is mirrored to auth.users metadata');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'a1000000-0000-4000-8000-00000000000a', 'role', 'authenticated')::text, true);
select is_empty($$ with u as (update public.profiles set ui_locale = 'ru'
  where id = 'a1000000-0000-4000-8000-00000000000b' returning 1) select * from u $$,
  'updating another user''s profile affects 0 rows');
select throws_ok($$ update public.profiles set id = 'a1000000-0000-4000-8000-0000000000ff'
  where id = 'a1000000-0000-4000-8000-00000000000a' $$, '42501', null, 'profile id is immutable');
select throws_ok($$ insert into public.profiles (id) values ('a1000000-0000-4000-8000-0000000000fe') $$,
  '42501', null, 'owner cannot insert profiles');
select throws_ok($$ delete from public.profiles where id = 'a1000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'owner cannot delete profiles');
reset role;

-- 8. anon -----------------------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select * from public.credit_ledger $$, '42501', null, 'anon cannot read the ledger');
select throws_ok($$ select * from public.credit_balances $$, '42501', null, 'anon cannot read balances');
reset role;

-- 9. D5 fingerprint ---------------------------------------------------------------------------------
select ok(not has_schema_privilege('anon', 'private', 'USAGE'), 'anon has no USAGE on private');
select ok(not has_schema_privilege('authenticated', 'private', 'USAGE'), 'authenticated has no USAGE on private');
select ok((select relrowsecurity from pg_class where oid = 'private.deleted_account_fingerprints'::regclass),
  'fingerprint table has RLS enabled');
select columns_are('private', 'deleted_account_fingerprints', array['email_hmac'], 'the table has only email_hmac');
select ok(not exists (
  select 1 from unnest(array['anon', 'authenticated', 'service_role']) r,
    unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p
  where has_table_privilege(r, 'private.deleted_account_fingerprints', p)),
  'anon, authenticated, service_role have no table privileges');
select ok((select count(*) = 1 and bool_and(octet_length(decode(decrypted_secret, 'hex')) = 32)
  from vault.decrypted_secrets where name = 'signup_bonus_fingerprint_key'),
  'exactly one Vault key of 32 bytes');
select ok(not has_function_privilege('anon', 'internal.email_fingerprint(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'internal.email_fingerprint(text)', 'EXECUTE')
  and not has_function_privilege('public', 'internal.email_fingerprint(text)', 'EXECUTE'),
  'roles cannot execute email_fingerprint');

insert into auth.users (id, email) values
  ('d5000000-0000-4000-8000-000000000001', 'D5.m1x@Example.test'),
  ('d5000000-0000-4000-8000-000000000003', null);
select set_config('t.c0', (select count(*)::text from private.deleted_account_fingerprints), true);
delete from auth.users where id = 'd5000000-0000-4000-8000-000000000001';
select ok(
  (select count(*) from private.deleted_account_fingerprints)::text::int = current_setting('t.c0')::int + 1
  and exists (select 1 from private.deleted_account_fingerprints where email_hmac = extensions.hmac(
    convert_to('d5.m1x@example.test', 'UTF8'),
    decode((select decrypted_secret from vault.decrypted_secrets where name = 'signup_bonus_fingerprint_key'), 'hex'),
    'sha256')),
  'deleting a user adds exactly one HMAC of the normalized email');

insert into auth.users (id, email) values ('d5000000-0000-4000-8000-000000000002', '  D5.M1X@EXAMPLE.TEST ');
select is((select count(*)::int from public.profiles where id = 'd5000000-0000-4000-8000-000000000002'),
  1, 're-sign-up with a deleted email still creates the profile');
select is((select count(*)::int from public.credit_ledger where user_id = 'd5000000-0000-4000-8000-000000000002')
  + (select count(*)::int from public.credit_balances where user_id = 'd5000000-0000-4000-8000-000000000002'),
  0, '... and no ledger row and no balance');

insert into auth.users (id, email) values ('d5000000-0000-4000-8000-000000000004', 'd5.m1-fresh@example.test');
select is((select count(*)::int from public.credit_ledger
  where user_id = 'd5000000-0000-4000-8000-000000000004' and delta = 20 and reason = 'signup_grant'),
  1, 'an unrelated new user still gets the grant');

select set_config('t.c1', (select count(*)::text from private.deleted_account_fingerprints), true);
delete from auth.users where id = 'd5000000-0000-4000-8000-000000000002';
select is((select count(*)::int from private.deleted_account_fingerprints), current_setting('t.c1')::int,
  'deleting a second user with the same normalized email keeps the row count');

delete from auth.users where id = 'd5000000-0000-4000-8000-000000000003';
select is((select count(*)::int from private.deleted_account_fingerprints), current_setting('t.c1')::int,
  'deleting a user without an email adds no row');

select ok((select array_agg(p.proname::text order by p.proname) from pg_proc p
  where p.prosrc ilike '%deleted_account_fingerprints%') = array['handle_new_user', 'record_deleted_account_fingerprint']
  and not exists (select 1 from pg_views where definition ilike '%deleted_account_fingerprints%'),
  'only the two trigger functions reference the table, and no view does');

select * from finish();
rollback;
