-- pgTAP: M1 candidate_profiles, resumes, the private resumes bucket and FK cascade rules.
--
-- Run with: bash scripts/supabase.sh test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(62);

insert into auth.users (id, email) values
  ('b1000000-0000-4000-8000-00000000000a', 'm1p.a@example.test'),
  ('b1000000-0000-4000-8000-00000000000b', 'm1p.b@example.test'),
  ('b1000000-0000-4000-8000-00000000000c', 'm1p.c@example.test');

insert into public.resumes (id, user_id, storage_path, file_name, mime_type, size_bytes) values
  ('c1000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-00000000000a',
   'b1000000-0000-4000-8000-00000000000a/r.pdf', 'r.pdf', 'application/pdf', 100),
  ('c1000000-0000-4000-8000-00000000000b', 'b1000000-0000-4000-8000-00000000000b',
   'b1000000-0000-4000-8000-00000000000b/r.pdf', 'r.pdf', 'application/pdf', 100);

insert into public.candidate_profiles (user_id) values ('b1000000-0000-4000-8000-00000000000c');

-- 1. is_complete -------------------------------------------------------------------------------------
select is((select is_complete from public.candidate_profiles where user_id = 'b1000000-0000-4000-8000-00000000000c'),
  false, 'an empty profile is incomplete');
update public.candidate_profiles set full_name = 'Ada', contact_email = 'ada@example.test',
  target_titles = array['Engineer'], skills = array['sql'], years_experience = '3_5'
  where user_id = 'b1000000-0000-4000-8000-00000000000c';
select is((select is_complete from public.candidate_profiles where user_id = 'b1000000-0000-4000-8000-00000000000c'),
  true, 'five required fields make it complete');
update public.candidate_profiles set skills = '{}' where user_id = 'b1000000-0000-4000-8000-00000000000c';
select is((select is_complete from public.candidate_profiles where user_id = 'b1000000-0000-4000-8000-00000000000c'),
  false, 'no skills: incomplete');
update public.candidate_profiles set skills = array['sql'], full_name = '  '
  where user_id = 'b1000000-0000-4000-8000-00000000000c';
select is((select is_complete from public.candidate_profiles where user_id = 'b1000000-0000-4000-8000-00000000000c'),
  false, 'blank full_name: incomplete');

-- 2. Constraints ---------------------------------------------------------------------------------------
select throws_ok($$ update public.candidate_profiles set salary_min = 10, salary_max = 5
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'salary_max < salary_min');
select throws_ok($$ update public.candidate_profiles set contact_email = 'nope'
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'malformed contact_email');
select throws_ok($$ update public.candidate_profiles set years_experience = 'x'
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'unknown years_experience');
select throws_ok($$ update public.candidate_profiles set target_titles = array_fill('t'::text, array[11])
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, '11 target_titles');
select throws_ok($$ update public.candidate_profiles set experience = '{}'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'experience must be an array');
select throws_ok($$ update public.candidate_profiles set full_name = repeat('x', 201)
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'full_name 201');
select throws_ok($$ update public.candidate_profiles set headline = repeat('x', 301)
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'headline 301');
select throws_ok($$ update public.candidate_profiles set phone = repeat('1', 51)
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'phone 51');
select throws_ok($$ update public.candidate_profiles set location = repeat('x', 201)
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'location 201');
select throws_ok($$ update public.candidate_profiles set contact_email = repeat('a', 309) || '@example.com'
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'contact_email 321');
select throws_ok($$ update public.candidate_profiles set work_authorization_other = repeat('x', 201)
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'work_authorization_other 201');
select throws_ok($$ update public.candidate_profiles set skills = array[repeat('x', 61)]
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'skills item 61');
select throws_ok($$ update public.candidate_profiles set target_titles = array[repeat('x', 101)]
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'target_titles item 101');
select throws_ok($$ update public.candidate_profiles
  set experience = jsonb_build_array(jsonb_build_object('description', repeat('x', 2001)))
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'experience description 2001');

-- 2b. links / entry keys and lengths (T-026 #5) -------------------------------------------------------------------
select lives_ok($$ update public.candidate_profiles
  set links = jsonb_build_object('linkedin', 'https://x.test/' || repeat('a', 485), 'portfolio', null)
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, 'links: 500-character url and null value are accepted');
select throws_ok($$ update public.candidate_profiles
  set links = jsonb_build_object('linkedin', 'https://x.test/' || repeat('a', 486))
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'links: 501-character url');
select throws_ok($$ update public.candidate_profiles set links = '{"github": "https://x.test"}'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'links: unknown key');
select throws_ok($$ update public.candidate_profiles set links = '{"linkedin": 5}'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'links: non-string value');
select throws_ok($$ update public.candidate_profiles set links = '[]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'links must be an object');
select lives_ok($$ update public.candidate_profiles set
    experience = '[{"title":"Dev","company":null,"start":"2020-01","end":null,"current":true,"description":null}]'::jsonb,
    education = '[{"institution":"MIT","degree":null,"field":null,"endYear":2020}]'::jsonb,
    languages = '[{"name":"English","level":"fluent"}]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, 'entries with exactly the known keys are accepted');
select throws_ok($$ update public.candidate_profiles
  set experience = '[{"title":"Dev","salary":1}]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'experience: unknown key');
select throws_ok($$ update public.candidate_profiles
  set experience = '["Dev"]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'experience: entry must be an object');
select throws_ok($$ update public.candidate_profiles
  set education = '[{"institution":"MIT","gpa":4}]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'education: unknown key');
select throws_ok($$ update public.candidate_profiles
  set education = '[{"institution":"MIT","end_year":2020}]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'education: snake_case end_year is not a stored key');
select throws_ok($$ update public.candidate_profiles
  set education = '[null]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'education: entry must be an object');
select throws_ok($$ update public.candidate_profiles
  set languages = '[{"name":"English","native":true}]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'languages: unknown key');
select throws_ok($$ update public.candidate_profiles
  set languages = '[1]'::jsonb
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'languages: entry must be an object');
select throws_ok($$ update public.candidate_profiles
  set education = jsonb_build_array(jsonb_build_object('institution', repeat('x', 201)))
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'education institution 201');
select throws_ok($$ update public.candidate_profiles
  set languages = jsonb_build_array(jsonb_build_object('name', repeat('x', 101)))
  where user_id = 'b1000000-0000-4000-8000-00000000000c' $$, '23514', null, 'languages name 101');
select throws_ok($$ insert into public.candidate_profiles (user_id, links)
  values ('b1000000-0000-4000-8000-00000000000a', '{"x":"y"}'::jsonb) $$, '23514', null, 'insert path: unknown links key');
select throws_ok($$ insert into public.candidate_profiles (user_id, education)
  values ('b1000000-0000-4000-8000-00000000000a', '[{"institution":"MIT","x":1}]'::jsonb) $$, '23514', null, 'insert path: unknown education key');

-- 3. Owner access to candidate_profiles ------------------------------------------------------------------
insert into public.candidate_profiles (user_id, full_name) values ('b1000000-0000-4000-8000-00000000000b', 'Bob');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'b1000000-0000-4000-8000-00000000000a', 'role', 'authenticated')::text, true);

select lives_ok($$ insert into public.candidate_profiles (full_name, updated_at)
  values ('Alice', now() - interval '1 day') $$, 'A inserts own profile (user_id defaults to auth.uid())');
select lives_ok($$ update public.candidate_profiles set full_name = 'Alice 2' $$, 'A updates own profile');
select throws_ok($$ insert into public.candidate_profiles (user_id) values ('b1000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'A cannot insert a profile for B');
select is_empty($$ select 1 from public.candidate_profiles where user_id = 'b1000000-0000-4000-8000-00000000000b' $$,
  'A cannot see B''s profile');
select is((select version from public.candidate_profiles), 2, 'version increments on update');
select ok((select updated_at > now() - interval '1 hour' from public.candidate_profiles), 'updated_at moves on update');
select throws_ok($$ delete from public.candidate_profiles where user_id = 'b1000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'owner cannot delete a profile');

-- 4. source_resume_id must belong to the same user -----------------------------------------------------------
select throws_ok($$ update public.candidate_profiles set source_resume_id = 'c1000000-0000-4000-8000-00000000000b' $$,
  '23503', null, 'source_resume_id pointing at another user''s resume is rejected');

-- 5. resumes -----------------------------------------------------------------------------------------------------
select throws_ok($$ insert into public.resumes (user_id, storage_path, file_name, mime_type, size_bytes)
  values ('b1000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-00000000000a/x.pdf', 'x.pdf', 'application/pdf', 1) $$,
  '42501', null, 'owner cannot insert resumes');
select throws_ok($$ update public.resumes set file_name = 'y.pdf' $$, '42501', null, 'owner cannot update resumes');
select throws_ok($$ delete from public.resumes $$, '42501', null, 'owner cannot delete resumes');
select is((select count(*)::int from public.resumes), 1, 'A sees only own resumes');
reset role;
select throws_ok($$ insert into public.resumes (user_id, storage_path, file_name, mime_type, size_bytes)
  values ('b1000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-00000000000a/second.pdf', 's.pdf', 'application/pdf', 1) $$,
  '23505', null, 'a second current resume for the same user is rejected');

set local role anon;
select throws_ok($$ select * from public.resumes $$, '42501', null, 'anon cannot select resumes');
select throws_ok($$ insert into public.resumes (user_id, storage_path, file_name, mime_type, size_bytes)
  values ('b1000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-00000000000a/z.pdf', 'z.pdf', 'application/pdf', 1) $$,
  '42501', null, 'anon cannot insert resumes');
select throws_ok($$ update public.resumes set file_name = 'q' $$, '42501', null, 'anon cannot update resumes');
select throws_ok($$ delete from public.resumes $$, '42501', null, 'anon cannot delete resumes');

-- 3 (anon on candidate_profiles) ------------------------------------------------------------------------------
select throws_ok($$ select * from public.candidate_profiles $$, '42501', null, 'anon cannot select profiles');
select throws_ok($$ insert into public.candidate_profiles (user_id) values ('b1000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'anon cannot insert profiles');
select throws_ok($$ update public.candidate_profiles set full_name = 'x' $$, '42501', null, 'anon cannot update profiles');
select throws_ok($$ delete from public.candidate_profiles $$, '42501', null, 'anon cannot delete profiles');
reset role;

-- 6. Bucket ----------------------------------------------------------------------------------------------------------
select ok(exists (select 1 from storage.buckets where id = 'resumes'), 'resumes bucket exists');
select is((select public from storage.buckets where id = 'resumes'), false, 'bucket is private');
select is((select file_size_limit from storage.buckets where id = 'resumes'), 5242880::bigint, 'bucket limit is 5 MiB');
select is((select array_agg(m order by m) from storage.buckets b, unnest(b.allowed_mime_types) m where b.id = 'resumes'),
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'bucket allows exactly PDF and DOCX');
select is_empty($$ select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and (coalesce(qual, '') ilike '%resumes%' or coalesce(with_check, '') ilike '%resumes%') $$,
  'no storage.objects policy mentions the resumes bucket');

-- 7. Cascade ------------------------------------------------------------------------------------------------------------
select is_empty($$ select c.conrelid::regclass from pg_constraint c
  where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
    and c.conrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)
    and c.confdeltype <> 'c' $$, 'every public FK to auth.users cascades on delete');

select * from finish();
rollback;
