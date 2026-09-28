-- M1 resumes, candidate profiles, private resumes bucket.

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique check (storage_path like user_id::text || '/%'),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_code text check (error_code in ('unreadable', 'ai_failed')),
  extracted jsonb check (extracted is null or jsonb_typeof(extracted) = 'object'),
  is_current boolean not null default true,
  attempts smallint not null default 0,
  parsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'failed') = (error_code is not null)),
  check (status <> 'ready' or extracted is not null)
);
create unique index resumes_one_current_per_user on public.resumes (user_id) where is_current;

revoke all on public.resumes from anon, authenticated;
grant select on public.resumes to authenticated;
create policy resumes_select_own on public.resumes
  for select to authenticated using (user_id = (select auth.uid()));

create trigger resumes_touch_updated_at
  before update on public.resumes
  for each row execute function internal.touch_updated_at();

create table public.candidate_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 200),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 320
    and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (char_length(phone) <= 50),
  location text check (char_length(location) <= 200),
  headline text check (char_length(headline) <= 300),
  target_titles text[] not null default '{}' check (cardinality(target_titles) <= 10),
  skills text[] not null default '{}' check (cardinality(skills) <= 100),
  years_experience text check (years_experience in ('lt_1', '1_2', '3_5', '6_10', '10_plus')),
  experience jsonb not null default '[]'
    check (jsonb_typeof(experience) = 'array' and jsonb_array_length(experience) <= 50),
  education jsonb not null default '[]'
    check (jsonb_typeof(education) = 'array' and jsonb_array_length(education) <= 20),
  languages jsonb not null default '[]'
    check (jsonb_typeof(languages) = 'array' and jsonb_array_length(languages) <= 20),
  links jsonb not null default '{}' check (jsonb_typeof(links) = 'object'),
  work_authorization text check (work_authorization in ('authorized', 'sponsorship', 'other')),
  work_authorization_other text check (char_length(work_authorization_other) <= 200),
  relocation text check (relocation in ('not_open', 'open', 'relocating')),
  notice_period text check (notice_period in ('immediate', '2_weeks', '1_month', '2_months_plus')),
  salary_min integer check (salary_min >= 0),
  salary_max integer check (salary_max >= 0),
  salary_currency text check (salary_currency ~ '^[A-Z]{3}$'),
  salary_period text check (salary_period in ('month', 'year')),
  source_resume_id uuid references public.resumes (id) on delete set null,
  version integer not null default 1,
  is_complete boolean generated always as (
    coalesce(btrim(full_name), '') <> ''
    and contact_email is not null
    and cardinality(target_titles) > 0
    and cardinality(skills) > 0
    and years_experience is not null
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_max is null or salary_min is null or salary_max >= salary_min)
);

revoke all on public.candidate_profiles from anon, authenticated;
grant select, insert, update on public.candidate_profiles to authenticated;

create policy candidate_profiles_select_own on public.candidate_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy candidate_profiles_insert_own on public.candidate_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy candidate_profiles_update_own on public.candidate_profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Array item and jsonb entry text limits that column checks cannot express.
create or replace function internal.touch_candidate_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
  if exists (
    select 1 from jsonb_array_elements(case when pg_catalog.jsonb_typeof(new.experience) = 'array' then new.experience else '[]'::jsonb end) e
    where pg_catalog.char_length(e ->> 'title') > 200
       or pg_catalog.char_length(e ->> 'company') > 200
       or pg_catalog.char_length(e ->> 'description') > 2000
  ) then
    raise exception 'experience entry text exceeds its limit' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(case when pg_catalog.jsonb_typeof(new.education) = 'array' then new.education else '[]'::jsonb end) e
    where pg_catalog.char_length(e ->> 'institution') > 200
       or pg_catalog.char_length(e ->> 'degree') > 200
       or pg_catalog.char_length(e ->> 'field') > 200
  ) then
    raise exception 'education entry text exceeds 200 characters' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(case when pg_catalog.jsonb_typeof(new.languages) = 'array' then new.languages else '[]'::jsonb end) e where pg_catalog.char_length(e ->> 'name') > 100
  ) then
    raise exception 'languages name exceeds 100 characters' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function internal.touch_candidate_profile() from public, anon, authenticated;

create trigger candidate_profiles_touch
  before insert or update on public.candidate_profiles
  for each row execute function internal.touch_candidate_profile();

-- Private resume bucket: no storage.objects policies; only the secret key reads or writes (ADR-0014).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
