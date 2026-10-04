-- M1 review fix (T-026 #5): enforce in SQL what the app already validates (PROFILE_LIMITS / zod):
--   * `links`: only the keys `linkedin` and `portfolio`, each a string of at most 500 characters
--     (or JSON null);
--   * `experience`, `education`, `languages`: every entry is an object with only the known keys.
-- Everything else in `internal.touch_candidate_profile()` is unchanged from the original migration.

create or replace function internal.touch_candidate_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  links_obj jsonb := case when pg_catalog.jsonb_typeof(new.links) = 'object' then new.links else '{}'::jsonb end;
  experience_arr jsonb := case when pg_catalog.jsonb_typeof(new.experience) = 'array' then new.experience else '[]'::jsonb end;
  education_arr jsonb := case when pg_catalog.jsonb_typeof(new.education) = 'array' then new.education else '[]'::jsonb end;
  languages_arr jsonb := case when pg_catalog.jsonb_typeof(new.languages) = 'array' then new.languages else '[]'::jsonb end;
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.version := old.version + 1;
    new.updated_at := pg_catalog.now();
  end if;

  if new.source_resume_id is not null and not exists (
    select 1 from public.resumes r where r.id = new.source_resume_id and r.user_id = new.user_id
  ) then
    raise exception 'source_resume_id must reference a resume of the same user'
      using errcode = '23503';
  end if;

  if exists (select 1 from unnest(new.target_titles) t where pg_catalog.char_length(t) > 100) then
    raise exception 'target_titles item exceeds 100 characters' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.skills) s where pg_catalog.char_length(s) > 60) then
    raise exception 'skills item exceeds 60 characters' using errcode = '23514';
  end if;

  -- links: known keys only, string (or null) values, 500 characters at most.
  if exists (select 1 from pg_catalog.jsonb_object_keys(links_obj) k where k not in ('linkedin', 'portfolio')) then
    raise exception 'links has an unknown key' using errcode = '23514';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_each(links_obj) l
    where pg_catalog.jsonb_typeof(l.value) not in ('string', 'null')
       or pg_catalog.char_length(l.value #>> '{}') > 500
  ) then
    raise exception 'links value must be a string of at most 500 characters' using errcode = '23514';
  end if;

  -- entries: objects with known keys only.
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(experience_arr) e
    where pg_catalog.jsonb_typeof(e) <> 'object'
       or exists (
         select 1 from pg_catalog.jsonb_object_keys(case when pg_catalog.jsonb_typeof(e) = 'object' then e else '{}'::jsonb end) k
         where k not in ('title', 'company', 'start', 'end', 'current', 'description'))
  ) then
    raise exception 'experience entry must be an object with known keys only' using errcode = '23514';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(education_arr) e
    where pg_catalog.jsonb_typeof(e) <> 'object'
       or exists (
         select 1 from pg_catalog.jsonb_object_keys(case when pg_catalog.jsonb_typeof(e) = 'object' then e else '{}'::jsonb end) k
         where k not in ('institution', 'degree', 'field', 'endYear'))
  ) then
    raise exception 'education entry must be an object with known keys only' using errcode = '23514';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(languages_arr) e
    where pg_catalog.jsonb_typeof(e) <> 'object'
       or exists (
         select 1 from pg_catalog.jsonb_object_keys(case when pg_catalog.jsonb_typeof(e) = 'object' then e else '{}'::jsonb end) k
         where k not in ('name', 'level'))
  ) then
    raise exception 'languages entry must be an object with known keys only' using errcode = '23514';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(experience_arr) e
    where pg_catalog.char_length(e ->> 'title') > 200
       or pg_catalog.char_length(e ->> 'company') > 200
       or pg_catalog.char_length(e ->> 'description') > 2000
  ) then
    raise exception 'experience entry text exceeds its limit' using errcode = '23514';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(education_arr) e
    where pg_catalog.char_length(e ->> 'institution') > 200
       or pg_catalog.char_length(e ->> 'degree') > 200
       or pg_catalog.char_length(e ->> 'field') > 200
  ) then
    raise exception 'education entry text exceeds 200 characters' using errcode = '23514';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(languages_arr) e
    where pg_catalog.char_length(e ->> 'name') > 100
  ) then
    raise exception 'languages name exceeds 100 characters' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function internal.touch_candidate_profile() from public, anon, authenticated;
