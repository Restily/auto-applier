-- pgTAP: RLS-by-default (internal.enforce_rls event trigger).
--
-- Run with: bash scripts/supabase.sh test db
--
-- The whole file runs in one transaction that is rolled back at the end, so the
-- probe table created in test 2 never lands in the real schema.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- 1. Every existing table (and partitioned table) in `public` already has RLS enabled.
select is_empty(
  $$
  select c.relname
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relrowsecurity = false
  $$,
  'no table in public has RLS disabled'
);

-- 2. A newly created table gets RLS enabled automatically by the event trigger.
create table public.__rls_probe (id int);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.__rls_probe'::regclass),
  'new tables get RLS automatically'
);

-- 3. The enforce_rls event trigger is enabled.
select is(
  (select evtenabled from pg_catalog.pg_event_trigger where evtname = 'enforce_rls'),
  'O',
  'enforce_rls event trigger is enabled'
);

-- 4. Only the migration/owner role can use the `internal` schema; the Data API roles cannot.
select ok(
  not has_schema_privilege('anon', 'internal', 'USAGE'),
  'anon has no USAGE privilege on schema internal'
);

select ok(
  not has_schema_privilege('authenticated', 'internal', 'USAGE'),
  'authenticated has no USAGE privilege on schema internal'
);

select * from finish();

rollback;
