-- Foundation migration: RLS-by-default.
--
-- Every table created in the `public` schema from now on gets row level security
-- enabled automatically, so a forgotten `enable row level security` can never ship
-- a world-readable table. Policies still need to be added per table; RLS with no
-- policies means "no access", which is the safe failure mode.

create schema if not exists internal;

revoke all on schema internal from public, anon, authenticated;

create or replace function internal.enforce_rls()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ddl_command record;
begin
  for ddl_command in select * from pg_catalog.pg_event_trigger_ddl_commands() loop
    if ddl_command.object_type = 'table' and ddl_command.schema_name = 'public' then
      execute pg_catalog.format('alter table %s enable row level security', ddl_command.object_identity);
    end if;
  end loop;
end;
$$;

create event trigger enforce_rls on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function internal.enforce_rls();
