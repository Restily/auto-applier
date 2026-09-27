# M1 Onboarding & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development, run by the Team Lead (the constitution fixes the execution method). Steps use checkbox (`- [ ]`) syntax for tracking. Tasks run in **waves** (see "Waves" below). Tasks inside a wave run in parallel, each in its own lead-created git worktree (`/home/user/aa-wt/M1-<task>`) branched from `milestone/M1-onboarding-profile`. Dispatch each implementer with `subagent_type` = the task's `Owner`.

**Goal:** A new user signs up (email/password, or Google when configured), gets 20 credits once, turns a PDF/DOCX resume into an editable profile or fills it by hand, uses the app in English or Russian, and can export or delete their data.

**Architecture:** Supabase Auth creates users. An `auth.users` trigger provisions the `profiles` row and the one-time credit grant (ADR-0013). Plain profile CRUD goes Next.js → supabase-js under RLS. Resume upload, AI extraction (Celery + LLM port), export and deletion go Next.js (server) → Python API `/v1` with the user's JWT (ADR-0004, ADR-0014, ADR-0016). next-intl provides EN/RU, with per-namespace catalogs and the locale taken from the profile when signed in (ADR-0015). The app shell follows MASTER §8.

**Tech Stack:** M0 stack (Next.js 16.3, React 19, TS ~6.0, Tailwind 4, shadcn/ui, Vitest 5, Playwright 1.56.1, FastAPI, asyncpg, Celery 5.6 + Valkey, Supabase CLI 2.118 local) plus these M1 additions. Registry versions and licenses were checked on 2026-09-27:
- web: `next-intl` 4.14 (MIT), `sonner` 2 (MIT), `react-hook-form` 7 (MIT), `@hookform/resolvers` 5 (MIT), `eslint-plugin-i18next` 6 (ISC), `@axe-core/playwright` 4.13 (MPL-2.0, unmodified);
- backend: `pyjwt[crypto]` 2.15 (MIT), `httpx` 0.28 (BSD), `python-multipart` 0.0.32 (Apache-2.0), `pypdf` 6.19 (BSD-3), `python-docx` 1.2 (MIT; its dependency `lxml` is BSD-3), `anthropic` 1.8 (MIT);
- backend dev: `respx` 0.23 (BSD), `pytest-cov` (MIT).

**Spec:** Stories S-001…S-006 (`python3 team/bin/board.py show S-00N`). Screen specs `docs/design/screens/S-001.md` … `S-006.md`, `docs/design/design-system/autoapplier/MASTER.md` (§5 components, §6.2 glossary, §7 states, §8 app shell). `docs/product/PRD.md` (product rules, NFRs). `docs/architecture/ARCHITECTURE.md`; ADR-0004, 0006, 0010, 0012, and the new ADR-0013 (provisioning + grant), ADR-0014 (resume pipeline), ADR-0015 (i18n details, amends 0010), ADR-0016 (export/deletion). M0 plan `docs/superpowers/plans/2026-09-27-M0-foundations.md` for the contracts this plan builds on.

## Global Constraints

- **Precondition:** M0 is merged and green (`board.py gate M0` PASS). Create `milestone/M1-onboarding-profile` from the integration branch. Every M0 contract is used as-is:
  - backend: `Settings`, `Container`/`build_container`, `create_app`, `AsyncRuntime`, `JobQueue`, `FakeLLMProvider`, `build_llm_provider`;
  - web: `createSupabaseServerClient`, `createSupabaseBrowserClient`, `createApiClient`, `getServerEnv`, `getPublicEnv`;
  - scripts: `gen:db-types`, `gen:api-types`, `check:*`.
  Extending an M0 file is allowed; changing an M0 signature is not.
- **Licenses:** only MIT, Apache-2.0, BSD, ISC, PSF, or MPL-2.0 used unmodified. **No GPL/AGPL/LGPL/SSPL**. PyMuPDF/fitz (AGPL) is forbidden. Check a new package's license on PyPI/npm before adding it. Keep the exact lockfiles (`backend/uv.lock`, `package-lock.json`).
- **context7 is unavailable.** Verify library APIs against the **installed** package (`uv run python -c "import inspect, anthropic; …"`, `node_modules/<pkg>/README.md`, `.d.ts` files). Record surprises in `docs/solutions/`.
- **Supabase is local only.** Only Task 1 may run `supabase db reset`, `supabase stop`/`start` or create migrations. Never `supabase link`/`db push`. RLS on every table.
- **No live third parties.** `APP_ENV=test` forces `LLM_PROVIDER=fake`. There is no real Google OAuth in tests. Email goes only to the local Mailpit (`http://127.0.0.1:54324`, API `/api/v1/…`).
- **The browser talks only to Next.js.** The Python API is called server-side with the user's access token. No secret, service key or storage URL ever reaches the browser. Resume files are never exposed by URL.
- **i18n:** every user-visible string in `apps/web/src/**/*.tsx` comes from `apps/web/messages/<en|ru>/<namespace>.json` (ADR-0015). Copy is taken **verbatim** from the screen-spec Copy/Validation tables and MASTER §6.2. RU plurals use ICU `plural` (one/few/many/other). The backend returns stable problem `code`s, never UI prose.
- **Data limits (DB constraint = zod = backend normalization; the names are shared):**
  - `full_name` ≤ 200, `contact_email` ≤ 320, `phone` ≤ 50, `location` ≤ 200, `headline` ≤ 300, URL ≤ 500;
  - `target_titles` ≤ 10 items of ≤ 100 chars; `skills` ≤ 100 items of ≤ 60 chars;
  - `experience` ≤ 50 entries, `education` ≤ 20, `languages` ≤ 20, entry `description` ≤ 2000;
  - resume file ≤ 5 MiB = **5 242 880 bytes**; resume text sent to the LLM ≤ 50 000 chars; a readable resume has ≥ 200 non-whitespace chars.
- **Enumerations (identical in SQL, Python and TS):**
  - `years_experience ∈ {lt_1, 1_2, 3_5, 6_10, 10_plus}`
  - `work_authorization ∈ {authorized, sponsorship, other}`
  - `relocation ∈ {not_open, open, relocating}`
  - `notice_period ∈ {immediate, 2_weeks, 1_month, 2_months_plus}`
  - `salary_period ∈ {month, year}`
  - `language level ∈ {native, fluent, advanced, intermediate, basic}`
  - `resume status ∈ {processing, ready, failed}`
  - `resume error_code ∈ {unreadable, ai_failed}`
  - `credit reason ∈ {signup_grant, plan_grant, application_sent, send_refund, period_expiry, operator_adjustment}`
- **Problem codes (RFC 9457 `code`):**

  | Code | Status |
  |---|---|
  | `auth.missing_token` | 401 |
  | `auth.invalid_token` | 401 |
  | `request.invalid` | 422 |
  | `request.too_large` | 413 |
  | `resume.unsupported_type` | 422 |
  | `resume.empty` | 422 |
  | `resume.too_large` | 413 |
  | `resume.not_found` | 404 |
  | `resume.not_retryable` | 409 |
  | `account.confirmation_mismatch` | 422 |
  | `account.delete_failed` | 502 |
  | `internal` | 500 |
- **Test data isolation:**
  - unique emails `be+<uuid>@example.test` (backend tests) and `qa+<uuid>@example.test` (qa tests); tests delete the users they create;
  - Redis prefixes `aa:test:<uuid>:`;
  - no truncates or resets; never `FLUSHALL`/`FLUSHDB`;
  - tests that would enqueue `resume.extract` inject `InMemoryJobQueue`. A worktree's tests must never hand tasks to the shared dev worker, which runs older code.
- **Generated files are never hand-edited or hand-merged:** `backend/openapi.json`, `apps/web/src/lib/api/schema.gen.ts`, `apps/web/src/lib/supabase/database.types.ts`, `backend/uv.lock`, `package-lock.json`. Regenerate them with `npm run gen:api-types`, `npm run gen:db-types`, `uv lock --directory backend` and `npm install`.
- Every task ends with `bash team/bin/quality-gate.sh fast` green and **one** Conventional Commit on its worktree branch. No push. Do not touch `.claude/`, `team/`, or `docs/` outside your role.

## Decisions made in this plan (inside AUTONOMY; the lead records them in the PRD decision log)

- **D1 — partial profile saves.** S-004 AC4 needs an *incomplete saved* profile ("the checklist lists exactly what is missing"), but screen spec S-004 says a save with missing required fields writes nothing. That would make AC4 unreachable, so the plan splits validation into two kinds:
  - **Format errors** (invalid email or URL, salary max < min, over-limit sizes) block the save.
  - **Missing required fields** do not block the write. They are highlighted inline and focus moves to the first one, but the data is saved and `is_complete` stays false. A toast `profile.savedIncomplete` confirms the partial save.

  The lead adds a board note for the designer to confirm this copy:

  | Key | EN | RU |
  |---|---|---|
  | `profile.savedIncomplete` | Saved. Fill in the highlighted fields to complete your profile. | Сохранено. Заполните отмеченные поля, чтобы завершить профиль. |
- **D2 — `user_roles` and `internal.is_operator()` move to M2** (first used by S-012). Adding them now would need `USAGE` on schema `internal` for `authenticated`, which the M0 pgTAP invariant forbids. M2 designs that grant.
- **D3 — OpenAI/OpenRouter adapters move to M2** (TECH-DEBT TD-004). M1 ships only the Anthropic adapter, the first real provider S-003 needs, because every M1 test uses the fake.
- **D4 — Google OAuth success is not automatable locally.** GoTrue discovers Google's OIDC endpoints itself, so a local fake can't stand in for them. What is automated:
  - button visibility, from GoTrue `/auth/v1/settings`;
  - the redirect start;
  - the callback cancel/error mapping (unit tests plus an e2e of the returned `error=access_denied` URL);
  - the one-grant-per-new-user trigger (pgTAP).

  The real consent round trip is a human live check before launch (TECH-DEBT TD-006, README checklist at MR).
- **D5 — sign-up grant abuse** (delete the account, sign up again with the same email, get 20 credits again) is **not** prevented in M1. Preventing it means keeping an email fingerprint after deletion, which conflicts with the deletion promise. The lead escalates it to the human (ADR-0013).

## Review Focus

1. **Spoofed or edge-case resume files.** Cases: a PNG renamed `.pdf`; a `.docx` that is a ZIP without `word/document.xml`; exactly 5 242 880 bytes vs one byte more; an empty file; an encrypted or corrupt PDF; a `Content-Length` of 100 MB. Expected: 422/413 before anything is stored, and exactly 5 MiB is accepted. A corrupt PDF becomes `failed/unreadable`, never a 500 or a stuck `processing`. Tests: Task 3 (`test_resume_files.py`, `test_document_text_extractor.py::test_corrupt_and_encrypted_pdf_raise_unreadable`), Task 6 (`test_resumes_api.py::test_content_length_over_limit_rejected_before_parsing`, `test_resume_service.py::test_exactly_max_bytes_accepted`), Task 11 (`validate.test.ts`).
2. **The worker is down or extraction hangs.** The UI must not spin forever. After 90 s the client shows the failure panel with "Try again". A resume stuck in `processing` for more than 90 s is retryable. Tests: Task 6 (`test_resume_service.py::test_retry_stale_processing`), Task 11 (`status.test.ts::times out after 90 s`).
3. **Cross-user access by id.** Cases: user B retries user A's resume id; the export contains foreign rows; direct Storage download; B reads A's `candidate_profiles`. Expected: 404 `resume.not_found` for the retry, own rows only in the export, denied for Storage, no rows for B. Tests: Task 6 (`test_resumes_api.py::test_retry_other_users_resume_is_404`), Task 7 (`test_account_export.py::test_export_contains_only_callers_rows`), Task 5 (`m1-storage.test.ts`, `m1-profiles.test.ts`).
4. **Open redirect through `?next=` and the auth callbacks.** Inputs: `next=//evil.test`, `next=https://evil.test`, `next=/\evil.test`, `next=javascript:…`. Expected: redirect to the app's own landing page. Tests: Task 4 (`redirects.test.ts`), Task 8 (`confirm/route.test.ts::unsafe next falls back`).
5. **Forged, expired or algorithm-confused JWTs on `/v1`.** Inputs: `alg: none`; HS256 signed with the public JWK; a wrong `aud` or `iss`; `exp` in the past; an unknown `kid`. Expected: 401 `auth.invalid_token`, with the token never echoed in the body or logs. Tests: Task 2 (`test_jwt_verifier.py`, `test_api_auth.py::test_problem_never_echoes_token`, `test_logging_redaction.py`).

---

## File map

| Path | Task | Responsibility |
|---|---|---|
| `supabase/migrations/<ts>_m1_accounts.sql`, `<ts>_m1_profiles_resumes.sql`, `supabase/config.toml`, `supabase/templates/recovery.html`, `supabase/tests/database/m1_*.test.sql` | 1 | schema, RLS, triggers, bucket, auth config, localized reset email |
| `backend/tests/integration/supabase_helpers.py`, `backend/tests/integration/test_auth_gotrue.py` | 1 | GoTrue/Mailpit test helpers; sign-up, grant and reset-email checks |
| `apps/web/src/lib/supabase/database.types.ts` | 1 (regenerated) | generated DB types |
| `backend/src/autoapplier/{ports/auth.py,ports/storage.py,adapters/auth/*,adapters/storage/*,db/as_user.py,api/auth.py,api/errors.py,api/schemas/problem.py,api/routes/me.py,logging.py}` | 2 | JWT verification, `as_user`, problem+json, Storage and Auth-admin adapters, log redaction |
| `backend/src/autoapplier/{domain/profile.py,domain/resume_files.py,ports/documents.py,adapters/documents/*,adapters/llm/anthropic.py,adapters/llm/fixtures/*}`, `backend/tests/contract/llm/*`, `backend/tests/fixtures/resumes/*` | 3 | ProfileDraft, file sniffing, text extraction, Anthropic adapter, fake markers |
| `apps/web/src/i18n/*`, `apps/web/messages/**`, `apps/web/src/proxy.ts`, `apps/web/src/lib/{auth/session.ts,auth/redirects.ts,auth/landing.ts,auth/sign-out.ts,credits.ts,shell/data.ts,validation/messages.ts,supabase/proxy.ts}`, `apps/web/src/components/shell/*`, `apps/web/src/components/ui/*` (new shadcn primitives), route-group layouts | 4 | i18n platform, session proxy, app shell, header widgets |
| `tests/integration/helpers/{supabase,mailpit}.ts`, `tests/integration/rls/m1-*.test.ts`, `tests/e2e/fixtures/*`, `tests/e2e/helpers/*` | 5 | qa harness: throwaway users, Mailpit, axe, RLS/Storage as real users |
| `backend/src/autoapplier/{ports/jobs.py,ports/resume_store.py,db/resumes.py,services/resumes.py,services/resume_extraction.py,worker/tasks/resume.py,api/routes/resumes.py,api/schemas/resumes.py}` | 6 | resume upload API, extraction job |
| `backend/src/autoapplier/{domain/account.py,ports/account.py,services/account_export.py,services/account_deletion.py,db/account.py,api/routes/account.py,api/schemas/account.py}` | 7 | export and deletion API |
| `apps/web/src/app/(public)/{sign-up,sign-in,reset-password,auth/callback}/**`, `apps/web/src/app/auth/confirm/route.ts`, `apps/web/src/lib/auth/{schemas,errors,actions,providers,oauth}.ts`, `apps/web/src/components/auth/*` | 8 | auth screens, reset, Google |
| `apps/web/src/lib/profile/{schema,completeness,queries,actions}.ts`, `apps/web/src/components/{profile,onboarding}/*`, `apps/web/src/app/(onboarding)/onboarding/{page.tsx,profile/page.tsx}`, `apps/web/src/app/(app)/profile/page.tsx` | 9 | profile editor, onboarding checklist |
| `apps/web/src/app/(app)/settings/page.tsx`, `apps/web/src/app/(public)/account-deleted/page.tsx`, `apps/web/src/app/api/account/export/route.ts`, `apps/web/src/lib/account/*`, `apps/web/src/components/settings/*` | 10 | settings, language card, export and delete UI |
| `apps/web/src/app/(onboarding)/onboarding/resume/page.tsx`, `apps/web/src/app/api/resume/route.ts`, `apps/web/src/lib/resume/*`, `apps/web/src/lib/profile/merge.ts`, `apps/web/src/components/resume/*` | 11 | upload UI, polling, replace + review dialog |
| `tests/e2e/{auth,i18n,a11y}/*` | 12 | e2e for S-001, S-002, S-005 |
| `tests/fixtures/resumes/*`, `tests/e2e/{resume,profile,account}/*` | 13 | e2e for S-003, S-004, S-006; full gate |

---

### Task 1: M1 schema, RLS, triggers, resume bucket, Auth config and localized reset email

**Owner:** backend-dev · **Story:** S-001, S-003, S-004, S-005, S-006 (data layer) · **Wave:** 1 (alone: restarts Supabase and resets the DB)

**Files:**
- Create (via `bash scripts/supabase.sh migration new m1_accounts` then `… new m1_profiles_resumes`): `supabase/migrations/<ts>_m1_accounts.sql`, `supabase/migrations/<ts>_m1_profiles_resumes.sql`
- Create: `supabase/templates/recovery.html`, `supabase/tests/database/m1_accounts.test.sql`, `supabase/tests/database/m1_profiles_resumes.test.sql`
- Create: `backend/tests/integration/supabase_helpers.py`, `backend/tests/integration/test_auth_gotrue.py`
- Modify: `supabase/config.toml`, `backend/tests/integration/conftest.py` (fixtures `make_user`, `mailpit_url`)
- Regenerate: `apps/web/src/lib/supabase/database.types.ts` (`npm run gen:db-types`)

**Interfaces — schema contract** (column order free; names, types, constraints and policies exact):

`m1_accounts.sql`:
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ui_locale text not null default 'en' check (ui_locale in ('en','ru')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- RLS (enabled by the M0 event trigger). Policies for authenticated:
--   select using (id = (select auth.uid())); update using/with check (id = (select auth.uid()))
-- Grants: revoke all from anon, authenticated; grant select, update (ui_locale) on profiles to authenticated

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('signup_grant','plan_grant','application_sent','send_refund','period_expiry','operator_adjustment')),
  ref_type text not null, ref_id text not null,
  created_at timestamptz not null default now(),
  unique (reason, ref_type, ref_id)
);
create index on public.credit_ledger (user_id, created_at desc);
-- RLS pattern R: policy select using (user_id = (select auth.uid())) for authenticated.
-- Grants: revoke all from anon, authenticated; grant select to authenticated.

create view public.credit_balances with (security_invoker = true) as
  select user_id, sum(delta)::integer as balance from public.credit_ledger group by user_id;
-- grant select on credit_balances to authenticated; revoke all from anon.

-- internal.handle_new_user(): trigger fn, SECURITY DEFINER, set search_path = ''  (ADR-0013)
--   insert profiles(id, ui_locale := locale from new.raw_user_meta_data->>'locale' if in (en,ru) else 'en') on conflict do nothing
--   insert credit_ledger(user_id, delta, reason, ref_type, ref_id) = (new.id, 20, 'signup_grant', 'auth_user', new.id::text)
--     on conflict (reason, ref_type, ref_id) do nothing
-- create trigger on_auth_user_created after insert on auth.users for each row execute function internal.handle_new_user();
-- backfill: the same two inserts for every existing auth.users row (idempotent)
-- internal.sync_profile_locale(): after update of ui_locale on public.profiles → auth.users.raw_user_meta_data
--   = coalesce(raw_user_meta_data,'{}') || jsonb_build_object('locale', new.ui_locale); SECURITY DEFINER, search_path ''
-- internal.touch_updated_at(): generic before-update trigger setting updated_at = now() (profiles, resumes)
```
`m1_profiles_resumes.sql`:
```sql
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique check (storage_path like user_id::text || '/%'),
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  error_code text check (error_code in ('unreadable','ai_failed')),
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
-- RLS pattern R: select own only; revoke insert/update/delete from anon, authenticated (backend writes via service connection)

create table public.candidate_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 200),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 320
                            and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (char_length(phone) <= 50),
  location text check (char_length(location) <= 200),
  headline text check (char_length(headline) <= 300),
  target_titles text[] not null default '{}' check (cardinality(target_titles) <= 10),
  skills text[] not null default '{}' check (cardinality(skills) <= 100),
  years_experience text check (years_experience in ('lt_1','1_2','3_5','6_10','10_plus')),
  experience jsonb not null default '[]' check (jsonb_typeof(experience) = 'array' and jsonb_array_length(experience) <= 50),
  education  jsonb not null default '[]' check (jsonb_typeof(education)  = 'array' and jsonb_array_length(education)  <= 20),
  languages  jsonb not null default '[]' check (jsonb_typeof(languages)  = 'array' and jsonb_array_length(languages)  <= 20),
  links jsonb not null default '{}' check (jsonb_typeof(links) = 'object'),
  work_authorization text check (work_authorization in ('authorized','sponsorship','other')),
  work_authorization_other text check (char_length(work_authorization_other) <= 200),
  relocation text check (relocation in ('not_open','open','relocating')),
  notice_period text check (notice_period in ('immediate','2_weeks','1_month','2_months_plus')),
  salary_min integer check (salary_min >= 0),
  salary_max integer check (salary_max >= 0),
  salary_currency text check (salary_currency ~ '^[A-Z]{3}$'),
  salary_period text check (salary_period in ('month','year')),
  source_resume_id uuid references public.resumes(id) on delete set null,
  version integer not null default 1,
  is_complete boolean generated always as (
    coalesce(btrim(full_name), '') <> '' and contact_email is not null
    and cardinality(target_titles) > 0 and cardinality(skills) > 0 and years_experience is not null) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_max is null or salary_min is null or salary_max >= salary_min)
);
-- RLS pattern O for authenticated: select/insert/update where user_id = (select auth.uid()); no delete policy.
-- Grants: revoke all from anon; grant select, insert, update to authenticated.
-- internal.touch_candidate_profile(): before insert or update — on update: version = old.version + 1, updated_at = now(),
--   user_id immutable; on both: if source_resume_id is not null and it is not a resume of new.user_id → raise 23503/42501.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- NO storage.objects policies for bucket 'resumes' (only the service/secret key reads or writes; ADR-0014)
```
`supabase/config.toml` changes:
- `[auth] site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/**", "http://127.0.0.1:3000/**"]`, `minimum_password_length = 8`.
- `[auth.rate_limit]`: `email_sent = 1000`, `sign_in_sign_ups = 1000`, `token_verifications = 1000`, `token_refresh = 1000`. The defaults (2 emails per hour, 30 sign-ups per 5 min) would break the suites. Local-only values; add a comment saying so.
- `[auth.email.template.recovery]`: `subject` bilingual unless GoTrue renders template syntax in subjects (check with the test); `content_path = "./supabase/templates/recovery.html"`.
- `[auth.external.google]`: `enabled = false`, `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`, `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`, `skip_nonce_check = false`. Add a comment: "the human enables it with real credentials; the web hides the button while GoTrue reports google=false".

`recovery.html`:
- one template, branching with `{{ if eq .Data.locale "ru" }}…{{ else }}…{{ end }}`;
- EN heading "Reset your password" and RU heading "Восстановление пароля" (MASTER §6.2), plus one sentence and a button link;
- link = `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.

Test helpers (`backend/tests/integration/supabase_helpers.py`), all `async` and using `httpx` with the `SUPABASE_SECRET_KEY` as `apikey`. Verify that the local Kong accepts the `sb_secret_…` key for these calls; if it also needs `Authorization: Bearer <key>`, send both, and write it up in `docs/solutions/`.
```python
@dataclass(frozen=True) class TestUser: id: UUID; email: str; password: str; access_token: str
async def admin_create_user(http, base_url, secret, *, locale: str = "en") -> TestUser  # POST /auth/v1/admin/users, email_confirm true, user_metadata.locale
async def password_sign_in(http, base_url, secret, email, password) -> httpx.Response  # POST /auth/v1/token?grant_type=password
async def admin_delete_user(http, base_url, secret, user_id) -> None                 # 404 ignored
async def wait_for_email(http, mailpit_url, to: str, *, timeout_s: float = 10) -> dict # polls /api/v1/search?query=to:"…", returns /api/v1/message/{ID}
```
Fixture `make_user` (async factory) creates `be+<uuid>@example.test` users and deletes them on teardown.

- [ ] **Step 1: Write the failing tests**
  - `m1_accounts.test.sql` (pgTAP; `begin … rollback`; users inserted into `auth.users` as `postgres` with fresh uuids; `set local role authenticated` + `set_config('request.jwt.claims', json_build_object('sub', <uuid>, 'role','authenticated')::text, true)` to act as a user):
    1. inserting a user with `raw_user_meta_data = {"locale":"ru"}` creates `profiles.ui_locale = 'ru'`; `{"locale":"de"}` gives `'en'`;
    2. exactly one `credit_ledger` row `(20, 'signup_grant', 'auth_user', id)` per new user; `credit_balances.balance = 20`;
    3. `update auth.users set last_sign_in_at = now()` (sign-in) adds no ledger row;
    4. inserting an `auth.identities` row for an existing user (Google linking) adds no ledger row;
    5. a manual duplicate `signup_grant` insert raises `unique_violation`;
    6. as user A: `select` from `credit_ledger`/`credit_balances` returns only A's rows; `insert`/`update`/`delete` on `credit_ledger` raise `42501`;
    7. as user A: `update profiles set ui_locale='ru'` succeeds and mirrors `auth.users.raw_user_meta_data->>'locale' = 'ru'`; updating another user's profile affects 0 rows; `update profiles set id = …` raises `42501`;
    8. `anon` gets `42501` or no rows on `profiles`, `credit_ledger`, `credit_balances`.
  - `m1_profiles_resumes.test.sql`:
    1. `is_complete` is false for an empty row, true with the five fields set, false when `skills = '{}'`, false when `full_name = '  '`;
    2. check violations: `salary_max < salary_min`; `contact_email = 'nope'`; `years_experience = 'x'`; 11 `target_titles`; `experience = '{}'::jsonb`;
    3. as user A: insert and update own `candidate_profiles`; insert with `user_id = B` → RLS violation; select of B's row → 0 rows; `version` increments and `updated_at` changes on update;
    4. `source_resume_id` pointing to B's resume → error;
    5. as user A: `insert`/`update`/`delete` on `resumes` → `42501`; select → own rows only; a second `is_current` row for the same user → `unique_violation`;
    6. bucket `resumes` exists, `public = false`, `file_size_limit = 5242880`, exactly the two MIME types; `pg_policies` on `storage.objects` has **no** policy whose `qual`/`with_check` mentions `'resumes'` for roles `anon`/`authenticated`/`public`;
    7. every foreign key from a `public` table to `auth.users` has `confdeltype = 'c'` (cascade).
  - `test_auth_gotrue.py` (integration, real GoTrue and Mailpit):
    - `test_email_signup_creates_profile_and_single_grant`: public `POST /auth/v1/signup` with `data.locale = "ru"` → `profiles.ui_locale = 'ru'` and one ledger row. Read via the `pool` fixture as postgres.
    - `test_repeated_sign_in_never_grants_again`: two password sign-ins → still one ledger row.
    - `test_password_shorter_than_8_is_rejected`: 7 characters → 422, error code `weak_password`, and no `auth.users` row for that email.
    - `test_duplicate_signup_creates_no_second_user`: the second sign-up → error code `user_already_exists`, and `count(*)` of users with that email = 1.
    - `test_recovery_email_english_by_default`: `POST /auth/v1/recover` → the Mailpit message HTML contains `/auth/confirm?token_hash=`, `type=recovery` and "Reset your password".
    - `test_recovery_email_russian_after_locale_switch`: set `profiles.ui_locale = 'ru'` (the trigger mirrors it) → the message contains "Восстановление пароля" and not the EN heading.
- [ ] **Step 2: Run the tests and confirm they fail.** `npm run -s test:db` → FAIL (tables missing). `uv run --directory backend pytest tests/integration/test_auth_gotrue.py -q` → FAIL.
- [ ] **Step 3: Implement** the migrations, config, template and helpers. Apply them:
  ```bash
  bash scripts/supabase.sh stop
  bash team/bin/app.sh supabase
  bash scripts/supabase.sh db reset
  python3 scripts/sync_env.py
  ```
  The restart is needed because of the config and template changes. Report that this wiped local data. If sign-up through GoTrue fails with a permission error from the trigger, grant the missing privilege to `supabase_auth_admin` in the migration, and record it in `docs/solutions/`.
- [ ] **Step 4: Verify**
  - `npm run -s test:db` → PASS, including M0's `rls_default`.
  - `uv run --directory backend pytest tests/integration/test_auth_gotrue.py -q` → PASS.
  - `npm run -s gen:db-types && npm run -s check:db-types` → exit 0. `grep -c 'candidate_profiles' apps/web/src/lib/supabase/database.types.ts` ≥ 1.
  - `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(db): m1 accounts, credit ledger, profiles, resumes, private bucket, localized reset email`

---

### Task 2: API platform — JWT auth, `as_user`, problem details, Storage and Auth-admin adapters, log redaction

**Owner:** backend-dev · **Story:** S-003, S-006 (platform they need) · **Wave:** 2

**Files:**
- Modify: `backend/pyproject.toml`
  - deps: `pyjwt[crypto]>=2.10`, `httpx>=0.28` (move it from dev to runtime), `python-multipart>=0.0.20`;
  - dev: `respx>=0.22`, `pytest-cov>=6`;
  - import-linter: contracts 1 and 2 also forbid `httpx` and `jwt`; contract 3 forbids `httpx` and `jwt`.
- Modify: `backend/src/autoapplier/config.py` (add `supabase_jwt_secret: SecretStr | None = None` and `auth_jwks_cache_ttl_s: float = Field(600, gt=0)`), `backend/.env.example` (`SUPABASE_JWT_SECRET=`), `backend/src/autoapplier/wiring.py`, `backend/src/autoapplier/api/app.py`, root `package.json` (`test:coverage:py` = `uv run --directory backend pytest tests/unit --cov=autoapplier.domain --cov=autoapplier.services --cov-report=term-missing -q`, not part of the gate)
- Create:
  - `backend/src/autoapplier/ports/auth.py`, `ports/storage.py`
  - `adapters/auth/{__init__,jwt_verifier,gotrue_admin,fake}.py`, `adapters/storage/{__init__,supabase,fake}.py`
  - `db/as_user.py`
  - `api/auth.py`, `api/errors.py`, `api/schemas/problem.py`, `api/routes/me.py`
  - `logging.py`
- Create tests:
  - unit: `test_jwt_verifier.py`, `test_api_auth.py`, `test_problem_handlers.py`, `test_logging_redaction.py`, `test_storage_fake.py`, `test_auth_fakes.py`
  - integration: `test_as_user.py`, `test_jwt_verifier_live.py`, `test_supabase_storage.py`, `test_gotrue_admin.py`
- Regenerate: `backend/openapi.json`, `apps/web/src/lib/api/schema.gen.ts` (`npm run gen:api-types`)

**Interfaces:**
```python
# ports/auth.py
@dataclass(frozen=True, slots=True)
class AuthClaims:
    user_id: UUID; email: str | None; role: str; session_id: str | None; raw: Mapping[str, Any]
class InvalidTokenError(Exception): ...          # str(e) is a short reason; never contains the token
class TokenVerifier(Protocol):
    async def verify(self, token: str) -> AuthClaims: ...
class AuthAdminError(Exception): ...
class AuthAdmin(Protocol):
    async def delete_user(self, user_id: UUID) -> None: ...   # idempotent: an already-missing user is success

# ports/storage.py
class StorageError(Exception): ...
class StorageNotFoundError(StorageError): ...
class FileStorage(Protocol):
    async def put(self, *, bucket: str, path: str, data: bytes, content_type: str) -> None: ...  # no upsert; existing → StorageError
    async def get(self, *, bucket: str, path: str) -> bytes: ...                                   # missing → StorageNotFoundError
    async def remove(self, *, bucket: str, paths: Sequence[str]) -> None: ...                      # missing paths are not an error
    async def list_paths(self, *, bucket: str, prefix: str) -> list[str]: ...                      # full paths directly under "<prefix>/"

# adapters/auth/jwt_verifier.py
class JwtVerifier:  # implements TokenVerifier (ADR-0004)
    def __init__(self, *, issuer: str, jwks_url: str, http: httpx.AsyncClient,
                 hs256_secret: SecretStr | None = None, cache_ttl_s: float = 600, leeway_s: float = 10) -> None
    # ES256/RS256 via JWKS matched by kid (one refetch on unknown kid); HS256 only if hs256_secret is set AND header alg == HS256;
    # requires exp, sub, aud == "authenticated", iss == issuer, role == "authenticated"; rejects alg "none"
# adapters/auth/gotrue_admin.py:  class GoTrueAdmin: __init__(self, *, base_url: str, secret_key: SecretStr, http: httpx.AsyncClient)
# adapters/auth/fake.py:          class FakeTokenVerifier(tokens: Mapping[str, AuthClaims]); class FakeAuthAdmin(deleted: list[UUID], fail_next())
# adapters/storage/supabase.py:   class SupabaseStorage: __init__(self, *, base_url: str, secret_key: SecretStr, http: httpx.AsyncClient)  # /storage/v1/object/…
# adapters/storage/fake.py:       class InMemoryFileStorage: objects: dict[tuple[str, str], tuple[bytes, str]]; fail_next(op: str)

# db/as_user.py
@asynccontextmanager
async def as_user(pool: asyncpg.Pool, claims: AuthClaims) -> AsyncIterator[asyncpg.Connection]
# acquire → transaction → SET LOCAL ROLE authenticated → set_config('request.jwt.claims', json(claims.raw), true)

# api/schemas/problem.py
class FieldError(BaseModel): loc: list[str | int]; type: str
class Problem(BaseModel): type: str = "about:blank"; title: str; status: int; detail: str | None = None; code: str; errors: list[FieldError] | None = None
# api/errors.py
class ApiProblem(Exception):
    def __init__(self, status: int, code: str, title: str, detail: str | None = None) -> None
def install_problem_handlers(app: FastAPI) -> None
# ApiProblem → problem+json; RequestValidationError → 422 "request.invalid" + errors; any other exception → 500 "internal"
# with no exception text. Media type "application/problem+json".
# api/auth.py
async def current_user(request: Request) -> AuthClaims
# Missing Bearer → 401 auth.missing_token; InvalidTokenError → 401 auth.invalid_token. Both add `WWW-Authenticate: Bearer`.
CurrentUser = Annotated[AuthClaims, Depends(current_user)]
# api/routes/me.py:  GET /v1/me → MeResponse{user_id: UUID, email: str | None}; operation id get_me; 401 documented with Problem
# logging.py
def configure_logging(settings: Settings) -> None   # JSON lines; redacts values whose key matches
# (?i)(password|secret|token|authorization|api_?key|cookie) → "[redacted]"
```
- `Container` (extend M0) gains `http: httpx.AsyncClient`, `tokens: TokenVerifier`, `auth_admin: AuthAdmin`, `storage: FileStorage`.
  - `issuer = f"{settings.supabase_url}/auth/v1"`; `jwks_url = f"{issuer}/.well-known/jwks.json"`.
  - `build_container` still never raises when backends are down. `close_container` closes `http`.
- `create_app` calls `install_problem_handlers` and includes the `me` router.

- [ ] **Step 1: Write the failing tests**
  - `test_jwt_verifier.py`: generate an ES256 key with `cryptography`, serve the JWKS with `respx`. Cases:
    - `test_valid_es256_token_returns_claims`
    - `test_expired_token_rejected`
    - `test_wrong_audience_rejected`
    - `test_wrong_issuer_rejected`
    - `test_alg_none_rejected`
    - `test_hs256_rejected_without_secret`
    - `test_hs256_accepted_with_secret`
    - `test_hs256_signed_with_public_key_bytes_rejected` (algorithm confusion)
    - `test_unknown_kid_refetches_once_then_rejects`
    - `test_jwks_cached_between_verifications` (one HTTP call for two tokens)
    - `test_jwks_unreachable_is_invalid_token`
  - `test_api_auth.py` (ASGI, `FakeTokenVerifier`):
    - `test_missing_header_401_missing_token_with_www_authenticate`
    - `test_bad_token_401_invalid_token`
    - `test_me_returns_user`
    - `test_problem_never_echoes_token` (the token string is absent from the body)
  - `test_problem_handlers.py`:
    - `test_api_problem_serialized_as_problem_json`
    - `test_validation_error_422_request_invalid_with_errors`
    - `test_unhandled_exception_500_without_message`
  - `test_logging_redaction.py`: `test_authorization_and_password_values_redacted`, `test_other_fields_kept`.
  - `test_storage_fake.py`, `test_auth_fakes.py`: the protocol contract (put/get/remove/list semantics above) and conformance (`storage: FileStorage = InMemoryFileStorage()` type-checks).
  - Integration:
    - `test_as_user.py` (two `make_user` users; sample rows via the service `pool`):
      - `test_auth_uid_is_the_caller`
      - `test_rls_limits_rows_to_caller` (credit_ledger)
      - `test_role_reset_after_block` (the same pooled connection reports `current_user = 'postgres'` afterwards)
      - `test_exception_rolls_back`
    - `test_jwt_verifier_live.py`: `test_token_from_local_gotrue_verifies` (ES256 via JWKS), `test_tampered_token_rejected`.
    - `test_supabase_storage.py` under `resumes/<uuid>/`: `test_put_get_list_remove_roundtrip`, `test_put_existing_path_raises`, `test_get_missing_raises_not_found`, `test_remove_missing_is_ok`.
    - `test_gotrue_admin.py`: `test_delete_user_blocks_password_sign_in`, `test_delete_twice_is_ok`.
- [ ] **Step 2: Run them and confirm they fail.** `uv run --directory backend pytest tests/unit tests/integration -q -k "jwt or api_auth or problem or redaction or storage or auth_fakes or as_user or gotrue_admin"` → FAIL.
- [ ] **Step 3: Implement.** Then run `npm run -s gen:api-types`.
- [ ] **Step 4: Verify.** `npm run -s test:integration:py` → PASS. `uv run --directory backend pytest tests/unit -q` → PASS. `npm run -s check:openapi` → exit 0. `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(api): jwt auth, as_user rls helper, problem details, storage and auth-admin adapters`

---

### Task 3: ProfileDraft, resume file sniffing, document text extraction, Anthropic adapter, fake markers

**Owner:** backend-dev · **Story:** S-003 · **Wave:** 2

**Files:**
- Modify: `backend/pyproject.toml`
  - deps: `anthropic>=1.8,<2`, `pypdf>=6`, `python-docx>=1.2`;
  - mypy: `ignore_missing_imports` for `docx`, `docx.*` only if the installed package has no `py.typed`;
  - import-linter: contracts 1–3 forbid `anthropic`, `pypdf` and `docx`.
- Modify: `backend/src/autoapplier/adapters/llm/fake.py` (the new kwarg `enable_markers`), `adapters/llm/registry.py`, `backend/.env.example` (a comment with suggested ids: `LLM_MODEL_SMART=claude-opus-5`, `LLM_MODEL_FAST=claude-haiku-4-5`)
- Create: `backend/src/autoapplier/domain/profile.py`, `domain/resume_files.py`, `ports/documents.py`, `adapters/documents/{__init__,pypdf_docx}.py`, `adapters/llm/anthropic.py`, `adapters/llm/fixtures/{resume.extract.json,resume.extract.v2.json}`
- Create tests and fixtures:
  - `backend/tests/fixtures/resumes/make_fixtures.py` (CLI `--out DIR`), which writes: `resume-text.pdf` ("Alex Ivanov" CV, ≥ 1 page of text), `resume.docx`, `resume-v2.docx` (contains `[[fake-llm:variant=v2]]`), `ai-fail.pdf` (contains `[[fake-llm:fail]]`), `scanned.pdf` (image-only, no text layer), `encrypted.pdf`, `corrupt.pdf`, `not-a-resume.png`, `png-renamed.pdf`;
  - the committed outputs in `backend/tests/fixtures/resumes/`;
  - `backend/tests/fixtures/llm/anthropic/{message_json.json,refusal.json,invalid_json.json}`: response bodies in the documented Messages API shape. Mark them "hand-built, not live-recorded" in a README line.
  - unit: `test_profile_draft.py`, `test_resume_files.py`, `test_document_text_extractor.py`, `test_llm_fake_markers.py`; extend `test_llm_registry.py`;
  - contract: `backend/tests/contract/__init__.py`, `backend/tests/contract/llm/test_llm_provider_contract.py`.

**Interfaces:**
```python
# domain/profile.py  (pydantic v2; limits and enums from Global Constraints)
YearsExperience = Literal["lt_1", "1_2", "3_5", "6_10", "10_plus"]
LanguageLevel = Literal["native", "fluent", "advanced", "intermediate", "basic"]
class ExperienceEntry(BaseModel): title: str; company: str | None; start: str | None; end: str | None; current: bool = False; description: str | None
    # start/end "YYYY-MM" or None
class EducationEntry(BaseModel): institution: str; degree: str | None; field: str | None; end_year: int | None
class LanguageEntry(BaseModel): name: str; level: LanguageLevel | None
class ProfileLinks(BaseModel): linkedin: str | None; portfolio: str | None
class ProfileDraft(BaseModel):
    full_name: str | None; contact_email: str | None; phone: str | None; location: str | None; headline: str | None
    target_titles: list[str]; skills: list[str]; years_experience: YearsExperience | None
    experience: list[ExperienceEntry]; education: list[EducationEntry]; languages: list[LanguageEntry]; links: ProfileLinks
def normalize_draft(raw: Mapping[str, Any]) -> ProfileDraft
    # trims; drops an invalid email or URL (→ None); dedupes titles/skills case-insensitively keeping the first spelling;
    # truncates lists and strings to the limits; bad dates → None; unknown enum → None; never raises on wrong shapes
    # (missing keys → defaults); raises ValueError only if raw is not a mapping
def profile_draft_json_schema() -> dict[str, Any]
    # strict JSON Schema for LLM structured output: every object has additionalProperties false; every property is
    # required, nullable where optional

# domain/resume_files.py
DocumentKind = Literal["pdf", "docx"]
RESUME_MAX_BYTES: Final = 5 * 1024 * 1024
MIME_BY_KIND: Final[Mapping[DocumentKind, str]]
MIN_TEXT_CHARS: Final = 200
MAX_TEXT_CHARS: Final = 50_000
def sniff_resume_kind(data: bytes, file_name: str) -> DocumentKind | None
    # .pdf + b"%PDF-" magic; .docx + ZIP (stdlib zipfile on BytesIO) containing "word/document.xml"; else None
def is_readable_text(text: str) -> bool     # ≥ MIN_TEXT_CHARS non-whitespace characters

# ports/documents.py
class DocumentUnreadableError(Exception): ...
class DocumentTextExtractor(Protocol):
    def extract_text(self, data: bytes, kind: DocumentKind) -> str: ...   # sync, CPU-bound; callers use asyncio.to_thread
# adapters/documents/pypdf_docx.py: class PyPdfDocxTextExtractor  — encrypted/corrupt input → DocumentUnreadableError

# adapters/llm/anthropic.py
class AnthropicProvider:  # implements LLMProvider (ADR-0006)
    name = "anthropic"
    def __init__(self, *, api_key: SecretStr, models: Mapping[ModelTier, str], timeout_s: float = 45.0,
                 client: anthropic.AsyncAnthropic | None = None) -> None   # SDK max_retries=0 (the service owns retries)
    async def complete(self, request: LLMRequest) -> LLMResponse
    # Messages API; request.json_schema → structured output (output_config format json_schema; check the installed SDK);
    # never sends temperature/top_p (current Claude models reject sampling params).
    # Errors: RateLimitError/InternalServerError/APIConnectionError/APITimeoutError → LLMUnavailableError;
    #   AuthenticationError/PermissionDeniedError/NotFoundError → LLMConfigError; BadRequestError → LLMError;
    #   stop_reason "refusal" or "max_tokens" → LLMError; unparsable JSON → one retry, then LLMError.
# adapters/llm/registry.py:
#   "anthropic" factory → requires ANTHROPIC_API_KEY, LLM_MODEL_SMART, LLM_MODEL_FAST; a missing one → LLMConfigError naming it
#   "fake" factory → FakeLLMProvider(fixtures_dir=<package>/adapters/llm/fixtures, enable_markers=True)
# adapters/llm/fake.py: FakeLLMProvider(..., enable_markers: bool = False) — when enabled and any message contains
#   "[[fake-llm:fail]]" → raise LLMUnavailableError("fake: scripted failure");
#   "[[fake-llm:variant=<name>]]" → fixture "<task>.<name>.json" wins over "<task>.json"
```
- [ ] **Step 1: Write the failing tests**
  - `test_profile_draft.py`:
    - `test_fixture_draft_normalizes_to_expected_fields`
    - `test_invalid_email_and_url_dropped`
    - `test_titles_and_skills_deduped_case_insensitive`
    - `test_lists_truncated_to_limits`
    - `test_wrong_shapes_default_without_raising`
    - `test_json_schema_is_strict` (every object has `additionalProperties: false` and full `required`)
  - `test_resume_files.py`:
    - `test_pdf_detected`
    - `test_docx_detected`
    - `test_png_renamed_pdf_rejected`
    - `test_zip_without_document_xml_rejected`
    - `test_doc_extension_rejected`
    - `test_pdf_magic_with_docx_name_rejected`
    - `test_empty_rejected`
    - `test_uppercase_extension_accepted`
  - `test_document_text_extractor.py`:
    - `test_text_pdf_contains_name`
    - `test_docx_contains_name`
    - `test_scanned_pdf_text_is_not_readable` (`is_readable_text` is False)
    - `test_corrupt_and_encrypted_pdf_raise_unreadable`
  - `test_llm_fake_markers.py`:
    - `test_fail_marker_raises_unavailable`
    - `test_variant_marker_selects_variant_fixture`
    - `test_markers_ignored_when_disabled`
  - `test_llm_registry.py` (extend):
    - `test_anthropic_requires_key_and_models` (the message names the missing variable)
    - `test_anthropic_built_with_key_and_models`
    - `test_fake_registry_provider_serves_resume_fixture`
  - `test_llm_provider_contract.py`, parametrized over `fake` and `anthropic` (the latter with a `respx` route on `https://api.anthropic.com/v1/messages` serving the fixtures):
    - `test_structured_request_returns_data`
    - `test_rate_limit_is_unavailable` (429)
    - `test_timeout_is_unavailable`
    - `test_auth_error_is_config_error` (401)
    - `test_refusal_is_llm_error`
    - `test_invalid_json_twice_is_llm_error`

    For the fake, each case is scripted through `FakeReply`/`fail_next`.
- [ ] **Step 2: Run them and confirm they fail.** `uv run --directory backend pytest tests/unit tests/contract -q` → FAIL.
- [ ] **Step 3: Implement.** Generate the fixtures with `uv run --directory backend python tests/fixtures/resumes/make_fixtures.py --out tests/fixtures/resumes`.
- [ ] **Step 4: Verify.** `uv run --directory backend pytest tests/unit tests/contract -q` → PASS. `npm run -s lint:py` → PASS (contracts). `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(resume): profile draft model, file sniffing, pdf/docx text extraction, anthropic llm adapter`

---

### Task 4: Web platform — next-intl, session proxy, app shell and header widgets

**Owner:** frontend-dev · **Story:** S-005 (plus S-001 AC6 redirect) · **Wave:** 2

**Files:**
- Modify `apps/web/package.json`:
  - deps: `next-intl@^4.14`, `sonner@^2`, `react-hook-form@^7`, `@hookform/resolvers@^5`;
  - dev: `eslint-plugin-i18next@^6`, `@vitest/coverage-v8@^5`;
  - script `test:coverage`.
- Add the shadcn primitives with `npx shadcn@latest add input label alert alert-dialog dialog dropdown-menu popover avatar progress skeleton separator sheet tooltip select radio-group command sonner sidebar`.
- Modify: `apps/web/next.config.ts` (the `createNextIntlPlugin("./src/i18n/request.ts")` wrapper), `apps/web/eslint.config.mjs`, `apps/web/vitest.config.mts` (the `coverage` block for `src/lib/**`), `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/health/page.tsx` + `apps/web/src/components/health/health-status.tsx` + `apps/web/src/lib/health.ts` (labels via the `health` namespace; EN strings unchanged — pays TD-001)
- Create:
  - `apps/web/src/i18n/{config,negotiate,messages,request,actions,types.d}.ts`
  - `apps/web/messages/{en,ru}/{common,shell,validation,auth,onboarding,profile,resume,settings,account,health}.json` (`auth`, `onboarding`, `profile`, `resume`, `settings`, `account` = `{}`)
  - `apps/web/src/proxy.ts`, `apps/web/src/lib/supabase/proxy.ts`
  - `apps/web/src/lib/auth/{session,redirects,landing,sign-out}.ts`, `apps/web/src/lib/credits.ts`, `apps/web/src/lib/shell/data.ts`, `apps/web/src/lib/validation/messages.ts`
  - `apps/web/src/components/shell/{focus-shell,app-shell,site-header,credit-balance,language-switcher,account-menu,app-sidebar,skip-link}.tsx`
  - route-group layouts `apps/web/src/app/(public)/layout.tsx`, `(onboarding)/layout.tsx`, `(app)/layout.tsx`
- Create tests:
  - `apps/web/src/i18n/{negotiate,messages,actions}.test.ts`
  - `apps/web/src/lib/{auth/redirects,credits}.test.ts`
  - `apps/web/src/components/shell/{site-header,language-switcher,app-shell}.test.tsx`
  - `apps/web/eslint-i18n.test.ts`

**Interfaces:**
```ts
// i18n/config.ts
export const LOCALES = ["en", "ru"] as const; export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en"; export const LOCALE_COOKIE = "NEXT_LOCALE";
export const NAMESPACES = ["common","shell","validation","auth","onboarding","profile","resume","settings","account","health"] as const;
export function isLocale(v: unknown): v is Locale;
// i18n/negotiate.ts — Russian iff the highest-q language tag has primary subtag "ru" (case-insensitive); else "en"
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale;
// i18n/messages.ts — static imports of every namespace file; deep-merges en under the requested locale (silent EN fallback)
export type Messages = { [N in (typeof NAMESPACES)[number]]: Record<string, unknown> };
export async function loadMessages(locale: Locale): Promise<Messages>;
// i18n/request.ts — next-intl getRequestConfig. Locale order (ADR-0015): signed-in profiles.ui_locale → NEXT_LOCALE cookie
//   → negotiateLocale(Accept-Language) → "en". onError logs MISSING_MESSAGE via console.error; getMessageFallback returns ""
//   (never the key).
// i18n/actions.ts ("use server")
export async function setLocale(locale: Locale): Promise<{ persisted: boolean }>;
//   invalid → throws; sets cookie (1 year, path "/", sameSite lax); signed in → update profiles.ui_locale; DB error →
//   { persisted: false } with the cookie still set; signed out → { persisted: true }
// lib/validation/messages.ts
export const VALIDATION_KEYS = ["required","email","url","minPassword","maxLength","maxItems","salaryRange","minTitles","minSkills"] as const;
export type ValidationKey = (typeof VALIDATION_KEYS)[number];   // zod issue messages carry these; rendered as t(`validation.${key}`)
// lib/auth/redirects.ts (pure)
export const PROTECTED_PREFIXES = ["/onboarding", "/profile", "/settings"] as const;
export const SIGNED_OUT_ONLY = ["/sign-in", "/sign-up"] as const;
export function safeNextPath(next: string | null | undefined): string | null;
export function decideProxyRedirect(i: { pathname: string; search: string; isSignedIn: boolean; hadAuthCookie: boolean }): string | null;
//   signed out + protected → "/sign-in?next=<encoded path+search>" (+ "&reason=session_expired" when hadAuthCookie);
//   signed in + SIGNED_OUT_ONLY → "/"; otherwise null
// lib/supabase/proxy.ts
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; isSignedIn: boolean; hadAuthCookie: boolean }>;
//   @supabase/ssr cookie refresh; uses auth.getClaims() if the installed supabase-js has it, else getUser()
// proxy.ts — updateSession + decideProxyRedirect; config.matcher excludes _next/static, _next/image, favicon.ico,
//   image files and ALL /api/* (route handlers check the session themselves; this also avoids proxy body limits on uploads)
// lib/auth/session.ts (server-only)
export type SessionUser = { id: string; email: string };
export const getSessionUser: () => Promise<SessionUser | null>;   // React cache()
export async function requireUser(): Promise<SessionUser>;        // redirect("/sign-in") if absent
// lib/auth/landing.ts (server-only)
export async function resolveLandingPath(): Promise<"/onboarding" | "/profile">;  // candidate_profiles.is_complete
// lib/auth/sign-out.ts ("use server")
export async function signOutAction(): Promise<never>;             // supabase.auth.signOut() → redirect("/sign-in")
// lib/credits.ts (pure)
export function creditsView(balance: number | null): { count: number; tone: "normal" | "low" | "empty" }; // low < 5, empty 0, null → 0
// lib/shell/data.ts (server-only)
export type ShellData = { email: string; initials: string; balance: number; locale: Locale; onboardingComplete: boolean };
export const getShellData: () => Promise<ShellData>;              // React cache(); credit_balances + candidate_profiles
```
Components:
- `FocusShell({ data?: ShellData, children })`: MASTER §8.2. Pre-auth (`data` undefined) shows only the logo and the language switcher.
- `AppShell({ data, children })`: MASTER §8.3. Data-driven `NAV_ITEMS = [{ href: "/profile", icon: UserRound, key: "shell.nav.profile" }, { href: "/settings", icon: Settings2, key: "shell.nav.settings" }]`. Below 768 px there is a top bar with a `☰` Sheet and no bottom tab bar (fewer than 3 destinations).
- `CreditBalance({ balance })`: a Popover. ICU plural `shell.credits.count`; the `empty` tone adds an icon and a warning treatment.
- `LanguageSwitcher({ locale })`: trigger "EN"/"RU"; menu items "English"/"Русский" as autonyms with a check on the active one. It calls `setLocale` then `router.refresh()`; `persisted:false` → toast `settings.language.saveFailed`.
- `AccountMenu({ data })`: Settings, "Complete your profile" (only while `!onboardingComplete`), and Sign out (a form posting `signOutAction`).
- Layouts:
  - `(public)` = `FocusShell` with no data;
  - `(onboarding)` = `requireUser()` + `FocusShell` with data;
  - `(app)` = `requireUser()` + `AppShell`.
- The root `layout.tsx` sets `<html lang={locale}>`, `NextIntlClientProvider` and a sonner `<Toaster/>`. `/` redirects: signed out → `/sign-up`; signed in → `resolveLandingPath()`.
- ESLint: `i18next/no-literal-string` (`mode: "jsx-text-only"`) as an error on `src/**/*.tsx`, excluding `src/components/ui/**` and `**/*.test.tsx`. Next to it, a config comment: "Add the string to apps/web/messages/<en|ru>/<namespace>.json and render it with useTranslations/getTranslations."
- Copy for `shell`, `common` and `validation`: MASTER §6.2, §8 and the S-001/S-003/S-004 validation tables.

- [ ] **Step 1: Write the failing tests**
  - `negotiate.test.ts`: `"ru-RU"→ru`, `"ru"→ru`, `"RU-ru"→ru`, `"en-US,en;q=0.9,ru;q=0.8"→en`, `"ru;q=0.5,en;q=0.9"→en`, `"uk-UA,ru;q=0.9"→en`, `"de-DE"→en`, `""`/`null`/`"*"`/`"@@"`→en.
  - `messages.test.ts`:
    - `every namespace exists in both locales`
    - `en and ru have identical key sets` (it lists the missing keys per file, in both directions)
    - `no empty string values`
    - `ru credits plural` (via next-intl `createTranslator`: 1 кредит, 2 кредита, 5 кредитов, 11 кредитов, 21 кредит)
    - `loadMessages falls back to en for a key missing in ru` (stubbed catalog)
  - `actions.test.ts` (mock the supabase server client and `next/headers` cookies):
    - `rejects an unsupported locale`
    - `sets the cookie for signed-out visitors`
    - `persists to profiles for signed-in users`
    - `returns persisted false and keeps the cookie when the update fails`
  - `redirects.test.ts`:
    - `safeNextPath`: `/profile` ok; `/profile?x=1` ok; `//evil.test` null; `https://evil.test` null; `/\evil.test` null; `javascript:alert(1)` null; > 512 chars null.
    - `decideProxyRedirect`: signed out on `/settings` → `/sign-in?next=%2Fsettings`; with `hadAuthCookie` it adds `reason=session_expired`; signed in on `/sign-in` → `/`; signed in on `/reset-password` → null; `/sign-up` signed out → null.
  - `credits.test.ts`: null → 0 empty; 0 empty; 4 low; 20 normal.
  - `site-header.test.tsx`:
    - `pre-auth shows logo and language only`
    - `signed-in shows "20 credits"` (EN) and `"20 кредитов"` (RU)
    - `zero balance shows warning icon and text`
  - `language-switcher.test.tsx`:
    - `trigger shows current code`
    - `menu lists English and Русский with current checked`
    - `selecting calls setLocale`
    - `shows save-failed toast when persisted is false`
  - `app-shell.test.tsx`:
    - `renders only Profile and Settings nav items`
    - `active item has aria-current=page`
    - `skip link is the first focusable element`
    - `account menu has Settings and Sign out`
  - `eslint-i18n.test.ts`:
    - `flags literal JSX text in src/app`
    - `allows t() calls`
    - `ignores src/components/ui`
- [ ] **Step 2: Run them and confirm they fail.** `npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**
  - `npm run -s lint && npm run -s typecheck && npm run -s test:unit && npm run -s build` → exit 0. The build proves that no route imports server-only code into the client.
  - `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(web): next-intl en/ru, session proxy, focus and full app shell with credit balance and language switcher`

---

### Task 5: QA harness — throwaway users, Mailpit, axe, RLS and Storage as real users

**Owner:** qa-automation · **Story:** S-001 (AC7), S-003 (AC5), S-004, S-005 · **Wave:** 2 (needs Task 1 only)

**Files:**
- Modify: root `package.json` (devDeps `@supabase/supabase-js@^2`, `@axe-core/playwright@^4.13`), `tests/tsconfig.json`
- Create:
  - `tests/integration/helpers/{supabase,mailpit,local-env}.ts`
  - `tests/integration/rls/{m1-ledger,m1-profiles,m1-storage}.test.ts`
  - `tests/e2e/fixtures/test.ts`
  - `tests/e2e/helpers/{auth,a11y,i18n,db}.ts`

**Interfaces:**
```ts
// tests/integration/helpers/local-env.ts — parses backend/.env and apps/web/.env.local (created by scripts/sync_env.py)
export function localEnv(): { supabaseUrl: string; secretKey: string; publishableKey: string; mailpitUrl: string; appUrl: string };
// tests/integration/helpers/supabase.ts
export type TestUser = { id: string; email: string; password: string; client: SupabaseClient; accessToken: string };
export async function createTestUser(opts?: { locale?: "en" | "ru"; password?: string }): Promise<TestUser>; // qa+<uuid>@example.test, admin API
export async function deleteTestUser(id: string): Promise<void>;                                               // 404 ignored
export function adminClient(): SupabaseClient;   // secret key; tests only
export function anonClient(): SupabaseClient;    // publishable key, no session
// tests/integration/helpers/mailpit.ts
export async function waitForEmail(to: string, opts?: { timeoutMs?: number; subjectIncludes?: string }): Promise<{ id: string; subject: string; html: string; text: string }>;
export function extractLink(html: string, pathPrefix: string): URL;
// tests/e2e/helpers/db.ts
export async function ledgerRows(userId: string): Promise<Array<{ delta: number; reason: string }>>;  // via adminClient
// tests/e2e/helpers/auth.ts
export async function signUpViaUi(page: Page, opts?: { email?: string; password?: string }): Promise<{ email: string; password: string }>;
export async function signInViaUi(page: Page, email: string, password: string): Promise<void>;
// tests/e2e/helpers/a11y.ts
export async function expectNoSeriousA11yViolations(page: Page): Promise<void>;   // AxeBuilder tags wcag2a, wcag2aa, wcag22aa; serious/critical = fail
// tests/e2e/helpers/i18n.ts
export async function expectNoRawKeys(page: Page): Promise<void>;   // no visible text matches /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/
export function collectMissingMessageErrors(page: Page): () => string[];   // console messages containing "MISSING_MESSAGE"
// tests/e2e/fixtures/test.ts — Playwright `test` extended with fixtures: newUser (API-created TestUser, deleted after), mailpit
```
- [ ] **Step 1: Write the tests.** They should pass against Task 1's schema; a failure is a bug for backend-dev.
  - `m1-ledger.test.ts`:
    - `new user sees exactly one signup_grant of 20`
    - `balance view returns 20`
    - `signing in again (new session) adds no rows`
    - `user cannot insert, update or delete ledger rows`
    - `user cannot read another user's rows`
    - `anon reads nothing`
  - `m1-profiles.test.ts`:
    - `user upserts and reads own candidate_profiles incl. application answers`
    - `user cannot write another user's profile`
    - `user cannot read another user's profile`
    - `user can update own ui_locale only`
    - `resumes are select-own and read-only for users`
  - `m1-storage.test.ts`: the admin uploads `resumes/<A>/x.pdf`, then:
    - `owner download denied`, `other user download denied`, `anon download denied`
    - `list under the owner's folder returns nothing or an error for the user`
    - `user upload into own folder denied`
    - `public URL does not serve the object` (the HTTP status is not 200)
- [ ] **Step 2: Run.** `npx vitest run --config vitest.config.ts tests/integration/rls` → PASS (Task 1 is merged). `npm run -s typecheck` → PASS.
- [ ] **Step 3: Commit** `test(qa): m1 harness, mailpit and axe helpers, rls and storage tests as real users`

---

### Task 6: Resume upload API and extraction job

**Owner:** backend-dev · **Story:** S-003 · **Wave:** 3 (needs Tasks 2 and 3)

**Files:**
- Create:
  - `backend/src/autoapplier/ports/jobs.py`, `ports/resume_store.py`
  - `db/resumes.py`
  - `services/resumes.py`, `services/resume_extraction.py`
  - `worker/tasks/resume.py`
  - `api/routes/resumes.py`, `api/schemas/resumes.py`
- Modify: `worker/jobs.py` (re-export `RESUME_EXTRACT`), `worker/celery_app.py` (import the resume tasks), `wiring.py`, `api/app.py`
- Create tests:
  - unit: `backend/tests/unit/doubles/resume_store.py` (in-memory `ResumeStore`), `test_resume_service.py`, `test_resume_extraction.py`, `test_resumes_api.py`, `test_resume_task.py`
  - integration: `test_resume_repository.py`, `test_resume_pipeline.py`
- Regenerate: `backend/openapi.json`, `apps/web/src/lib/api/schema.gen.ts`

**Interfaces:**
```python
# ports/jobs.py
RESUME_EXTRACT: Final = "resume.extract"
# ports/resume_store.py
ResumeStatus = Literal["processing", "ready", "failed"]; ResumeErrorCode = Literal["unreadable", "ai_failed"]
@dataclass(frozen=True, slots=True)
class ResumeRecord: id: UUID; user_id: UUID; storage_path: str; file_name: str; mime_type: str; size_bytes: int
                   status: ResumeStatus; error_code: ResumeErrorCode | None; extracted: Mapping[str, Any] | None
                   is_current: bool; attempts: int; created_at: datetime; updated_at: datetime
class ResumeStore(Protocol):
    async def insert_current(self, *, user_id: UUID, resume_id: UUID, storage_path: str, file_name: str,
                             mime_type: str, size_bytes: int) -> tuple[ResumeRecord, ResumeRecord | None]: ...
        # one transaction: demote the previous current (is_current=false), insert the new one; returns (new, previous)
    async def delete(self, *, user_id: UUID, resume_id: UUID) -> None: ...
    async def get_for_user(self, *, user_id: UUID, resume_id: UUID) -> ResumeRecord | None: ...
    async def get(self, resume_id: UUID) -> ResumeRecord | None: ...                           # worker (system) use
    async def claim_for_extraction(self, resume_id: UUID) -> ResumeRecord | None: ...          # processing → attempts+1; else None
    async def mark_ready(self, resume_id: UUID, draft: Mapping[str, Any]) -> None: ...         # parsed_at = now()
    async def mark_failed(self, resume_id: UUID, error_code: ResumeErrorCode) -> None: ...
    async def reset_for_retry(self, *, user_id: UUID, resume_id: UUID, stale_after_s: float) -> ResumeRecord | None: ...
        # failed, or processing with updated_at older than stale_after_s → processing, error_code null; else None
# db/resumes.py: class PgResumeStore(pool)  — service connection; EVERY user-facing method filters by user_id
# services/resumes.py
class ResumeRejected(Exception): code: Literal["resume.unsupported_type", "resume.too_large", "resume.empty"]
class ResumeNotFound(Exception): ...
class ResumeNotRetryable(Exception): ...
RESUME_BUCKET: Final = "resumes"; STALE_PROCESSING_S: Final = 90.0
class ResumeService:
    def __init__(self, store: ResumeStore, storage: FileStorage, queue: JobQueue) -> None
    async def upload(self, *, user_id: UUID, file_name: str, data: bytes) -> ResumeRecord
    # 1 empty → resume.empty; > RESUME_MAX_BYTES → resume.too_large; sniff None → resume.unsupported_type (no IO before this)
    # 2 put "<user_id>/<resume_id>.<kind>" → 3 insert_current (on failure: remove the object, re-raise)
    # 4 enqueue RESUME_EXTRACT args=[str(resume_id)] (a failure is logged; the row stays processing → stale retry recovers it)
    # 5 previous current: remove its object, then delete its row (best effort, logged)
    async def retry(self, *, user_id: UUID, resume_id: UUID) -> ResumeRecord   # not own → ResumeNotFound; not retryable → ResumeNotRetryable; enqueues
# services/resume_extraction.py
EXTRACTION_DEADLINE_S: Final = 55.0
RESUME_EXTRACT_SYSTEM: Final[str]   # instructs: extract only facts present in the text; null when absent; no invention
class ResumeExtractionService:
    def __init__(self, store: ResumeStore, storage: FileStorage, documents: DocumentTextExtractor, llm: LLMProvider,
                 *, clock: Callable[[], float] = time.monotonic, deadline_s: float = EXTRACTION_DEADLINE_S) -> None
    async def extract(self, resume_id: UUID) -> ResumeStatus
    # claim (None → return the current status, no work); get the file (missing → failed/unreadable);
    # text via asyncio.to_thread(documents.extract_text) (DocumentUnreadableError or not is_readable_text → failed/unreadable,
    # no LLM call); LLMRequest(task="resume.extract", tier="smart", max_output_tokens=4096,
    # json_schema=profile_draft_json_schema(), messages=(user: text[:MAX_TEXT_CHARS]));
    # LLMUnavailableError → one retry only if the deadline allows; any LLMError or data None → failed/ai_failed;
    # else mark_ready(normalize_draft(data).model_dump(mode="json"))
# worker/tasks/resume.py
@shared_task(name=RESUME_EXTRACT, ignore_result=True)
def extract_resume(resume_id: str) -> None    # runtime.run(lambda c: c.resume_extraction.extract(UUID(resume_id)))
# api/schemas/resumes.py
class ResumeOut(BaseModel): id: UUID; file_name: str; mime_type: str; size_bytes: int; status: ResumeStatus
                            error_code: ResumeErrorCode | None; created_at: datetime
# api/routes/resumes.py
# POST /v1/resumes (operation id upload_resume), multipart field "file" → 202 ResumeOut.
#   Before parsing: Content-Length > 6 MiB → 413 request.too_large. Reads at most RESUME_MAX_BYTES + 1 bytes.
#   ResumeRejected → 413 resume.too_large | 422 resume.unsupported_type | 422 resume.empty.
# POST /v1/resumes/{resume_id}/extraction (operation id retry_resume_extraction) → 202 ResumeOut
#   | 404 resume.not_found | 409 resume.not_retryable
# Every response documents 401/4xx with Problem.
```
`Container` gains `documents: DocumentTextExtractor`, `resumes: ResumeService` and `resume_extraction: ResumeExtractionService`.

- [ ] **Step 1: Write the failing tests**
  - `test_resume_service.py` (fakes: in-memory store, `InMemoryFileStorage`, `InMemoryJobQueue`):
    - `test_png_as_pdf_rejected_before_any_io` (storage empty, no job)
    - `test_empty_file_rejected`
    - `test_exactly_max_bytes_accepted`
    - `test_one_byte_over_rejected_too_large`
    - `test_upload_stores_object_row_and_enqueues`: path `<uid>/<id>.pdf`, status processing, job `resume.extract` with `[str(id)]`
    - `test_replace_removes_previous_object_and_row`
    - `test_storage_failure_leaves_no_row_and_no_job`
    - `test_insert_failure_removes_uploaded_object`
    - `test_retry_other_users_resume_not_found`
    - `test_retry_ready_not_retryable`
    - `test_retry_failed_requeues`
    - `test_retry_fresh_processing_not_retryable`
    - `test_retry_stale_processing`
  - `test_resume_extraction.py`:
    - `test_success_marks_ready_with_normalized_fixture_draft`
    - `test_short_text_unreadable_without_llm_call`
    - `test_document_error_unreadable`
    - `test_missing_object_unreadable`
    - `test_unavailable_then_success_ready_two_calls`
    - `test_unavailable_twice_ai_failed`
    - `test_deadline_exceeded_no_retry_ai_failed` (fake clock)
    - `test_llm_data_none_ai_failed`
    - `test_already_ready_is_noop`
  - `test_resumes_api.py` (ASGI, fake container):
    - `test_upload_202_returns_resume`
    - `test_content_length_over_limit_rejected_before_parsing`
    - `test_unsupported_type_422_code`
    - `test_too_large_413_code`
    - `test_requires_auth_401`
    - `test_retry_other_users_resume_is_404`
    - `test_retry_not_retryable_409`
  - `test_resume_task.py`: `test_task_registered_under_resume_extract`, `test_task_runs_extraction_through_runtime` (monkeypatched runtime).
  - Integration `test_resume_repository.py`:
    - `test_insert_current_demotes_previous`
    - `test_get_for_user_hides_other_users_rows`
    - `test_claim_only_once_while_processing`
    - `test_reset_for_retry_respects_staleness`
  - Integration `test_resume_pipeline.py` (a real container with `queue` replaced by `InMemoryJobQueue`, real Storage and DB, `make_user`):
    - `test_upload_then_extract_ready_under_60s`: POST the Task 3 `resume-text.pdf`, then `await container.resume_extraction.extract(id)` → row `ready`, draft `full_name == "Alex Ivanov"`, wall time < 60 s.
    - `test_rejected_upload_stores_nothing`: `png-renamed.pdf` → 422; `list_paths("resumes", "<uid>")` empty; no row.
    - `test_scanned_pdf_ends_unreadable_with_file_kept`: the object still exists.
- [ ] **Step 2: Run them and confirm they fail.** `uv run --directory backend pytest tests/unit -q -k resume` → FAIL.
- [ ] **Step 3: Implement.** Then run `npm run -s gen:api-types`.
- [ ] **Step 4: Verify.** `npm run -s test:integration:py` → PASS. `npm run -s check:openapi` → exit 0. `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(resume): upload api with magic-byte validation, private storage and celery extraction job`

---

### Task 7: Account export and deletion API

**Owner:** backend-dev · **Story:** S-006 · **Wave:** 3 (needs Task 2)

**Files:**
- Create: `backend/src/autoapplier/domain/account.py`, `ports/account.py`, `db/account.py`, `services/account_export.py`, `services/account_deletion.py`, `api/routes/account.py`, `api/schemas/account.py`
- Modify: `wiring.py`, `api/app.py`
- Create tests:
  - unit: `test_account_domain.py`, `test_account_deletion_service.py`, `test_account_api.py`
  - integration: `test_account_export.py`, `test_account_deletion.py`
- Regenerate: `backend/openapi.json`, `apps/web/src/lib/api/schema.gen.ts`

**Interfaces:**
```python
# domain/account.py
def emails_match(typed: str, account_email: str | None) -> bool    # strip + casefold; None → False
class ExportAccount(BaseModel): id: UUID; email: str | None; ui_locale: Literal["en", "ru"]; created_at: datetime
class ExportResume(BaseModel): id: UUID; file_name: str; mime_type: str; size_bytes: int; status: str
                               created_at: datetime; extracted: dict[str, Any] | None
class ExportLedgerEntry(BaseModel): delta: int; reason: str; created_at: datetime
class AccountExport(BaseModel):
    format_version: Literal[1] = 1; exported_at: datetime; account: ExportAccount
    profile: dict[str, Any] | None           # every candidate_profiles column except user_id
    resumes: list[ExportResume]; searches: list[dict[str, Any]]; applications: list[dict[str, Any]]
    credit_ledger: list[ExportLedgerEntry]; credit_balance: int
def export_filename(now: datetime) -> str   # "autoapplier-export-<YYYY-MM-DD>.json" (UTC date)
# ports/account.py
class AccountPurgeStep(Protocol):
    name: str
    async def purge(self, user_id: UUID) -> None: ...   # idempotent
# services/account_export.py
EXPORT_SECTIONS: Final[Mapping[str, str]] = {"account": "profiles", "profile": "candidate_profiles",
                                             "resumes": "resumes", "credit_ledger": "credit_ledger"}   # section → table
EXPORT_EXCLUDED: Final[Mapping[str, str]] = {}   # table → reason (why it isn't exported)
class AccountExportService:
    def __init__(self, pool: asyncpg.Pool) -> None
    async def export(self, claims: AuthClaims, *, now: datetime) -> AccountExport   # all reads inside as_user(pool, claims)
# services/account_deletion.py
class ConfirmationMismatch(Exception): ...
class AccountDeletionFailed(Exception): ...
class ResumeFilesPurge:  # AccountPurgeStep; name = "resume_files"; lists "<user_id>" under bucket "resumes" and removes all
    def __init__(self, storage: FileStorage) -> None
class AccountDeletionService:
    def __init__(self, auth_admin: AuthAdmin, steps: Sequence[AccountPurgeStep]) -> None
    async def delete(self, claims: AuthClaims, *, confirm_email: str) -> None
    # mismatch → ConfirmationMismatch (nothing called); steps in order, then auth_admin.delete_user;
    # any step/admin error → AccountDeletionFailed (later steps and the admin delete are not called)
# db/account.py
async def user_owned_tables(pool) -> list[tuple[str, str, str]]   # (schema, table, fk delete action) for FKs to auth.users
async def count_user_rows(pool, user_id: UUID) -> dict[str, int]  # per user-owned table (FK column resolved from pg_constraint)
# api/schemas/account.py:  class AccountDeletionRequest(BaseModel): confirm_email: str = Field(min_length=1, max_length=320)
# api/routes/account.py
# GET  /v1/account/export   (operation id export_account)  → 200 AccountExport;
#      headers Content-Disposition: attachment; filename="<export_filename>", Cache-Control: no-store
# POST /v1/account/deletion (operation id delete_account)  → 204 | 422 account.confirmation_mismatch | 502 account.delete_failed
```
`Container` gains `account_export` and `account_deletion`, with `PURGE_STEPS = [ResumeFilesPurge(storage)]` built in `wiring.py`. M3/M4 append steps there.

- [ ] **Step 1: Write the failing tests**
  - `test_account_domain.py`:
    - `test_emails_match_trims_and_ignores_case`
    - `test_emails_match_rejects_other`
    - `test_emails_match_none_is_false`
    - `test_export_filename_uses_utc_date`
  - `test_account_deletion_service.py` (`FakeAuthAdmin`, recording steps):
    - `test_mismatch_calls_nothing`
    - `test_steps_run_before_auth_delete`
    - `test_step_failure_stops_before_auth_delete`
    - `test_admin_failure_raises_failed`
    - `test_retry_after_failure_succeeds`
    - `test_resume_files_purge_removes_only_that_users_prefix` (`InMemoryFileStorage` with two users)
  - `test_account_api.py` (ASGI):
    - `test_export_headers_and_body_shape`
    - `test_delete_204`
    - `test_delete_mismatch_422_code`
    - `test_delete_failure_502_code`
    - `test_both_require_auth`
  - Integration `test_account_export.py`:
    - `test_export_contains_only_callers_rows`: A and B both have a profile, a resume row and a ledger; A's export has no B values; `credit_balance == 20`; `searches == []`; `applications == []`.
    - `test_export_covers_every_user_owned_table`: each table from `user_owned_tables` is an `EXPORT_SECTIONS` value or an `EXPORT_EXCLUDED` key.
  - Integration `test_account_deletion.py` (a real app and container, `make_user`, a resume object uploaded through `SupabaseStorage`):
    - `test_deletion_removes_everything`: 204; password sign-in then fails; `count_user_rows` all zero; `list_paths("resumes", uid)` empty.
    - `test_every_user_owned_table_cascades`: all delete actions are `c`.
    - `test_mismatch_keeps_account`: 422, and the user can still sign in.
- [ ] **Step 2: Run them and confirm they fail.** `uv run --directory backend pytest tests/unit -q -k account` → FAIL.
- [ ] **Step 3: Implement.** Then run `npm run -s gen:api-types`.
- [ ] **Step 4: Verify.** `npm run -s test:integration:py` → PASS. `npm run -s check:openapi` → exit 0. `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(account): json data export and full account deletion with enforced table coverage`

---

### Task 8: Auth screens — sign up, sign in, forgot/reset password, sign out, Google

**Owner:** frontend-dev · **Story:** S-001, S-002 · **Wave:** 3 (needs Task 4)

**Files:**
- Create:
  - pages: `apps/web/src/app/(public)/sign-up/page.tsx`, `(public)/sign-in/page.tsx`, `(public)/sign-in/forgot-password/page.tsx`, `(public)/reset-password/page.tsx`, `(public)/auth/callback/page.tsx`, and the route handler `apps/web/src/app/auth/confirm/route.ts`
  - lib: `apps/web/src/lib/auth/{schemas,errors,actions,providers,oauth}.ts`
  - components: `apps/web/src/components/auth/{auth-card,sign-up-form,sign-in-form,forgot-password-form,reset-password-form,password-field,password-requirement,google-button,expired-link-panel,oauth-callback,auth-notice}.tsx`
- Modify: `apps/web/messages/{en,ru}/auth.json`, `apps/web/src/lib/env.server.ts` + `apps/web/.env.example` (add `APP_ORIGIN`, url, default `http://localhost:3000`)
- Create tests:
  - `apps/web/src/lib/auth/{schemas,errors,actions,providers,oauth}.test.ts`
  - `apps/web/src/app/auth/confirm/route.test.ts`
  - `apps/web/src/components/auth/{sign-up-form,sign-in-form,reset-password-form}.test.tsx`

**Interfaces:**
```ts
// lib/auth/schemas.ts — zod; issue messages are ValidationKey
export const signUpSchema: z.ZodType<{ email: string; password: string }>;   // email trimmed + valid; password ≥ 8
export const signInSchema: z.ZodType<{ email: string; password: string }>;   // email valid; password non-empty
export const forgotPasswordSchema: z.ZodType<{ email: string }>;
export const resetPasswordSchema: z.ZodType<{ password: string }>;           // ≥ 8
// lib/auth/errors.ts (pure; inputs are Supabase AuthError-like {code?, status?, message?})
export type SignUpFormError = "duplicate_email" | "weak_password" | "rate_limited" | "unknown";
export type SignInFormError = "invalid_credentials" | "rate_limited";
export function mapSignUpError(e: { code?: string; status?: number }): SignUpFormError;  // user_already_exists|email_exists → duplicate_email
export function mapSignInError(e: { code?: string; status?: number }): SignInFormError;  // 429 → rate_limited; everything else → invalid_credentials
// lib/auth/actions.ts ("use server")
export type AuthFormState =
  | { status: "idle" }
  | { status: "error"; formError?: SignUpFormError | SignInFormError | "unknown"; fieldErrors?: Partial<Record<"email" | "password", ValidationKey>>; email?: string };
export async function signUpAction(prev: AuthFormState, fd: FormData): Promise<AuthFormState>;
//   invalid → fieldErrors (Supabase not called); signUp({ email, password, options: { data: { locale } } }) where locale is the
//   current next-intl locale; success → redirect("/onboarding?welcome=1")
export async function signInAction(prev: AuthFormState, fd: FormData): Promise<AuthFormState>;
//   success → cookie NEXT_LOCALE := profiles.ui_locale; redirect(safeNextPath(fd.next) ?? await resolveLandingPath())
export async function requestPasswordResetAction(prev: { status: "idle" | "sent" | "error"; fieldErrors?: { email?: ValidationKey } }, fd: FormData): Promise<typeof prev>;
//   valid email → always "sent" (unknown email too, and errors other than validation — no enumeration)
export async function updatePasswordAction(prev: AuthFormState, fd: FormData): Promise<AuthFormState>;
//   updateUser({ password }) → signOut({ scope: "global" }) → redirect("/sign-in?notice=password_updated")
export async function startGoogleSignInAction(): Promise<never>;
//   signInWithOAuth({ provider: "google", options: { redirectTo: `${APP_ORIGIN}/auth/callback` } }) → redirect(data.url)
export async function exchangeOAuthCodeAction(code: string): Promise<{ redirectTo: string }>;
//   exchangeCodeForSession → landing (+"?welcome=1" when isNewAccount) | "/sign-in?notice=oauth_failed"
// lib/auth/oauth.ts (pure)
export function callbackErrorRedirect(error: string | null): string | null;   // "access_denied" → "/sign-in?notice=oauth_cancelled"; other non-null → "/sign-in?notice=oauth_failed"; null → null
export function isNewAccount(u: { created_at: string; last_sign_in_at?: string | null }, now: Date): boolean; // created ≤ 120 s ago
// lib/auth/providers.ts (server-only)
export async function getAuthProviders(fetchImpl?: typeof fetch): Promise<{ google: boolean }>;
//   GET {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings with apikey; external.google === true; any failure → false; revalidate 60 s
// app/auth/confirm/route.ts — GET ?token_hash&type&next: only type "recovery"; verifyOtp → redirect(safeNextPath(next) ?? "/reset-password");
//   failure or bad params → redirect("/reset-password?error=link_invalid")
```
Screens:
- Layout, states, copy, accessibility and motion per S-001 §1–6 and S-002.
- Sign-in `notice` values:
  - `oauth_cancelled`: a neutral `Alert` with `role="alert"` that receives focus;
  - `oauth_failed`: the MASTER §7 error pattern with "Try again" → `/sign-in`;
  - `password_updated`: toast;
  - `session_expired`: toast.
- `/reset-password?error=link_invalid` renders the expired-link panel without the form.
- `/auth/callback`:
  - `error` present → `callbackErrorRedirect` server-side redirect;
  - `code` present → interstitial "Signing you in…" (`aria-live="polite"`); a client component calls `exchangeOAuthCodeAction`, then `router.replace`.
- The Google button and divider are **not rendered** when `getAuthProviders().google` is false.
- Copy goes into `messages/*/auth.json` from the S-001/S-002 tables and MASTER §6.2.

- [ ] **Step 1: Write the failing tests**
  - `schemas.test.ts`:
    - `malformed email → email`
    - `empty → required`
    - `7-char password → minPassword`
    - `8-char password ok`
    - `email is trimmed`
  - `errors.test.ts`:
    - `user_already_exists → duplicate_email`
    - `invalid_credentials and user_not_found and email_not_confirmed → invalid_credentials`
    - `429 → rate_limited`
  - `actions.test.ts` (mock the supabase server client, `next/navigation`, cookies, `resolveLandingPath`):
    - `signUp invalid input returns fieldErrors and never calls Supabase` (S-001 AC3)
    - `signUp duplicate returns duplicate_email without redirect` (AC2)
    - `signUp success passes locale metadata and redirects to /onboarding?welcome=1` (AC1)
    - `signIn wrong password and unknown email yield the same invalid_credentials` (AC4)
    - `signIn honours a safe next`
    - `signIn ignores an unsafe next`
    - `signIn copies profile locale into the cookie`
    - `reset request for unknown email reports sent`
    - `updatePassword signs out globally and redirects with notice` (AC5)
    - `startGoogle redirects to the provider url with /auth/callback redirectTo`
    - `exchangeOAuthCode new account adds welcome` (S-002 AC1)
    - `exchangeOAuthCode failure goes to oauth_failed`
  - `oauth.test.ts`:
    - `access_denied → oauth_cancelled` (S-002 AC2)
    - `server_error → oauth_failed`
    - `null → null`
    - `isNewAccount boundaries`
  - `providers.test.ts`:
    - `google true when settings say so`
    - `false when disabled`
    - `false when fetch rejects` (S-002 AC3)
  - `confirm/route.test.ts`:
    - `valid recovery token redirects to /reset-password`
    - `verifyOtp error → link_invalid` (reused or expired link, AC5)
    - `non-recovery type → link_invalid`
    - `unsafe next falls back`
  - `sign-up-form.test.tsx`:
    - `submit disabled until both fields have content`
    - `requirement line flips to met at 8 chars and is aria-describedby the password`
    - `duplicate alert shows message plus Sign in and Reset password buttons`
    - `no Google button or divider when google=false`
    - `Google button first when google=true`
    - `renders RU heading "Создайте аккаунт"`
  - `sign-in-form.test.tsx`:
    - `invalid credentials alert gets focus and both fields get danger state`
    - `oauth_cancelled notice renders neutral alert`
  - `reset-password-form.test.tsx`:
    - `expired panel replaces the form when error=link_invalid`
    - `Request a new link goes to forgot password`
- [ ] **Step 2: Run them and confirm they fail.** `npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.** `npm run -s lint && npm run -s typecheck && npm run -s test:unit && npm run -s build` → exit 0. `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(auth): sign up, sign in, password reset, sign out and google sign-in screens`

---

### Task 9: Profile editor and onboarding checklist

**Owner:** frontend-dev · **Story:** S-004 (plus the S-001 AC1 landing) · **Wave:** 3 (needs Task 4)

**Files:**
- Create:
  - lib: `apps/web/src/lib/profile/{schema,completeness,queries,actions}.ts`
  - components: `apps/web/src/components/profile/{profile-editor,section-card,chips-field,entry-list,experience-dialog,education-dialog,language-dialog,application-answers,salary-fields,unsaved-indicator,save-bar}.tsx`, `apps/web/src/components/onboarding/{checklist,step-card,welcome-toast,step-dots}.tsx`
  - pages: `apps/web/src/app/(onboarding)/onboarding/page.tsx`, `(onboarding)/onboarding/profile/page.tsx`, `(app)/profile/page.tsx`
- Modify: `apps/web/messages/{en,ru}/{profile,onboarding}.json`
- Create tests: `apps/web/src/lib/profile/{schema,completeness,actions}.test.ts`, `apps/web/src/components/profile/profile-editor.test.tsx`, `apps/web/src/components/onboarding/checklist.test.tsx`

**Interfaces:**
```ts
// lib/profile/schema.ts
export const YEARS_EXPERIENCE = ["lt_1","1_2","3_5","6_10","10_plus"] as const;   // and WORK_AUTH, RELOCATION, NOTICE_PERIOD,
export const SALARY_PERIOD = ["month","year"] as const;                          // LANGUAGE_LEVEL per Global Constraints
export const CURRENCIES: readonly string[];                                       // ISO 4217 subset: USD, EUR, GBP, RUB, KZT, GEL, AMD, TRY, AED, PLN, CAD, AUD
export type ProfileInput = {
  fullName: string; contactEmail: string; phone: string; location: string; headline: string;
  links: { linkedin: string; portfolio: string };
  targetTitles: string[]; skills: string[]; yearsExperience: (typeof YEARS_EXPERIENCE)[number] | null;
  experience: Array<{ title: string; company: string; start: string; end: string; current: boolean; description: string }>;
  education: Array<{ institution: string; degree: string; field: string; endYear: number | null }>;
  languages: Array<{ name: string; level: (typeof LANGUAGE_LEVEL)[number] | null }>;
  workAuthorization: (typeof WORK_AUTH)[number] | null; workAuthorizationOther: string;
  relocation: (typeof RELOCATION)[number] | null; noticePeriod: (typeof NOTICE_PERIOD)[number] | null;
  salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null; salaryPeriod: "month" | "year" | null;
  sourceResumeId: string | null;
};
export const profileFormatSchema: z.ZodType<ProfileInput>;   // format-only rules (D1): email, URL, limits, salaryRange (max ≥ min)
export function emptyProfile(accountEmail: string): ProfileInput;   // contactEmail defaults to the account email
export function toDbRow(p: ProfileInput): TablesInsert<"candidate_profiles">;   // "" → null; trims
export function fromDbRow(r: Tables<"candidate_profiles"> | null, accountEmail: string): ProfileInput;
// lib/profile/completeness.ts — mirrors the DB is_complete expression exactly
export const REQUIRED_FIELDS = ["fullName","contactEmail","targetTitles","skills","yearsExperience"] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];
export function missingProfileFields(p: ProfileInput | null): RequiredField[];   // fixed order; null → all five
export function isProfileStarted(p: ProfileInput | null): boolean;              // any required field present
export type ChecklistView = { total: 1; done: 0 | 1; steps: [{ id: "profile"; state: "incomplete" | "complete"; missing: RequiredField[] | null }] };
export function checklistView(p: ProfileInput | null): ChecklistView;          // missing null when not started or complete
// lib/profile/queries.ts (server-only)
export async function getProfile(): Promise<{ row: Tables<"candidate_profiles"> | null; accountEmail: string }>;
// lib/profile/actions.ts ("use server")
export type SaveProfileResult =
  | { ok: true; isComplete: boolean; missing: RequiredField[] }
  | { ok: false; fieldErrors: Record<string, ValidationKey> }
  | { ok: false; formError: "save_failed" };
export async function saveProfile(input: unknown): Promise<SaveProfileResult>;
//   format errors → fieldErrors, no DB call; else upsert (onConflict user_id) toDbRow(input) → revalidatePath("/onboarding"),
//   revalidatePath("/profile")
// components/profile/profile-editor.tsx ("use client")
export type ProfileEditorProps = {
  initial: ProfileInput; mode: "onboarding" | "app";
  bannerFileName?: string | null;     // shows "We filled this from {filename} — check it over." (dismissible)
  headerSlot?: React.ReactNode;       // Task 11 injects Replace resume / extraction notice here
  onSaved?: (r: Extract<SaveProfileResult, { ok: true }>) => void;
};
export function ProfileEditor(props: ProfileEditorProps): React.JSX.Element;
```
Behavior:
- Sections, fields, components and accessibility per S-003 §3d and S-004. Required markers show from the first render with `aria-required`. Chips use the combobox pattern, with remove buttons labelled "Remove {value}". Entries are edited in Dialogs. Salary is a `fieldset`/`legend`. "Unsaved changes" appears once the form is dirty, and `beforeunload` guards unsaved edits.
- On save (D1): format errors → inline errors, focus the first one, no write. Otherwise write, then:
  - if `missing.length > 0`, mark each missing field with its required error (`required`, `minTitles` or `minSkills`), focus the first in fixed order, and show the toast `profile.savedIncomplete`;
  - else show the toast "Saved". In `mode: "onboarding"`, a complete save navigates to `/onboarding`.
- Onboarding page (`/onboarding`):
  - the checklist per S-001 "Onboarding checklist" and the S-004 "Missing" copy (`onboarding.missing` = "Missing: {list}", joined by `Intl.ListFormat`/comma with the S-004 field names);
  - `?welcome=1` → toast "You've got 20 free credits" once, then `router.replace("/onboarding")`;
  - "Get started" → `/onboarding/resume` (built in Task 11); "Edit profile" → `/profile`.
- `/onboarding/profile`: FocusShell with step dots and `mode: "onboarding"`. `/profile`: AppShell with `mode: "app"`.

- [ ] **Step 1: Write the failing tests**
  - `completeness.test.ts`: uses the same cases as pgTAP Task 1 §1.
    - `null → all five, not started`
    - `name only → [contactEmail, targetTitles, skills, yearsExperience]`
    - `whitespace name counts as missing`
    - `all five → complete`
    - `checklist partial lists missing; untouched has missing null`
  - `schema.test.ts`:
    - `invalid email → email`
    - `invalid linkedin url → url`
    - `max < min → salaryRange on salaryMax`
    - `max == min ok`
    - `max without min ok`
    - `11 titles → maxItems`
    - `missing required fields are NOT format errors`
    - `toDbRow/fromDbRow round-trip keeps application answers and phone` (S-004 AC3)
  - `actions.test.ts`:
    - `format error → fieldErrors and no upsert` (AC2)
    - `missing required only → upsert called, ok with isComplete false and missing list` (AC2/AC4)
    - `complete → ok isComplete true` (AC1)
    - `db error → save_failed`
  - `profile-editor.test.tsx`:
    - `required fields carry aria-required from first render`
    - `saving with missing fields shows every missing error and focuses the first in fixed order` (AC2)
    - `invalid email blocks save`
    - `dirty shows Unsaved changes`
    - `chip remove button labelled Remove Playwright`
    - `salary controls grouped under Expected salary legend`
    - `RU labels render`
  - `checklist.test.tsx`:
    - `not started shows default body and Get started`
    - `partial shows exactly "Missing: contact email, at least one skill"` (AC4)
    - `RU partial shows "Не хватает: …"`
    - `complete shows Done, Edit profile and the all-done block`
    - `progress has aria-valuenow and a text name`
- [ ] **Step 2: Run them and confirm they fail.** `npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.** `npm run -s lint && npm run -s typecheck && npm run -s test:unit && npm run -s build` → exit 0. `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(profile): profile editor with application answers and onboarding checklist`

---

### Task 10: Settings — account, language, data export, delete account

**Owner:** frontend-dev · **Story:** S-005 (AC2 settings entry), S-006 · **Wave:** 4 (needs Tasks 4 and 7)

**Files:**
- Create:
  - pages and routes: `apps/web/src/app/(app)/settings/page.tsx`, `apps/web/src/app/(public)/account-deleted/page.tsx`, `apps/web/src/app/api/account/export/route.ts`
  - lib: `apps/web/src/lib/account/{confirm,actions,export-client}.ts`
  - components: `apps/web/src/components/settings/{account-card,language-card,data-card,danger-zone-card,delete-account-dialog}.tsx`
- Modify: `apps/web/messages/{en,ru}/{settings,account}.json`
- Create tests: `apps/web/src/lib/account/{confirm,actions,export-client}.test.ts`, `apps/web/src/app/api/account/export/route.test.ts`, `apps/web/src/components/settings/{delete-account-dialog,language-card,data-card}.test.tsx`

**Interfaces:**
```ts
// lib/account/confirm.ts (pure)
export function emailsMatch(typed: string, accountEmail: string): boolean;   // trim + case-insensitive (same rule as the backend)
// lib/account/actions.ts ("use server")
export async function deleteAccountAction(confirmEmail: string): Promise<{ ok: false; error: "mismatch" | "failed" }>;
//   createApiClient({ accessToken }).POST("/v1/account/deletion", { body: { confirm_email } });
//   204 → supabase.auth.signOut({ scope: "local" }) → redirect("/account-deleted"); 422 → mismatch; else → failed
// app/api/account/export/route.ts — GET: no session → 401 JSON; else GET /v1/account/export with the bearer token; on 200 stream the
//   body with Content-Type application/json, the API's Content-Disposition and Cache-Control no-store; otherwise 502 JSON
// lib/account/export-client.ts ("use client" helper)
export async function downloadExport(fetchImpl?: typeof fetch): Promise<"started" | "error">;
//   fetch("/api/account/export") → blob → object-URL anchor download named from Content-Disposition
```
Screens:
- Layout, copy and states per S-005 (Account, Language, Your data, Danger zone) and S-006 (6a–6c). The language card is a `RadioGroup` in a `fieldset`/`legend` with autonym labels. It calls `setLocale` (Task 4) and shows the save-failed toast when `persisted: false`.
- The delete dialog is an `AlertDialog`:
  - initial focus is on the input; "Delete my account" stays disabled until `emailsMatch`;
  - the live hint shows only while the typed text is non-empty and not matching;
  - Cancel/Escape/outside-click close the dialog, discard the input and make no call;
  - while deleting, the dialog can't be dismissed;
  - an error shows an in-dialog danger `Alert` with focus, and keeps the typed email.
- `/account-deleted` is a FocusShell without a session, with the h1 focused and a "Create a new account" link to `/sign-up`.

- [ ] **Step 1: Write the failing tests**
  - `confirm.test.ts`: `exact`, `trimmed`, `case-insensitive`, `different → false`.
  - `actions.test.ts`:
    - `204 → signOut local then redirect /account-deleted` (S-006 AC2)
    - `422 → mismatch`
    - `502 → failed and no signOut`
  - `route.test.ts`:
    - `401 without session`
    - `forwards bearer token and streams body with Content-Disposition` (AC1)
    - `API failure → 502`
  - `export-client.test.ts`:
    - `returns started and triggers a download with the header filename`
    - `returns error on non-200`
  - `delete-account-dialog.test.tsx`:
    - `confirm disabled on open`
    - `enables on case-insensitive trimmed match`
    - `hint only while mismatched and non-empty`
    - `Cancel closes, clears input and never calls the action` (AC3)
    - `Escape cancels without calling the action` (AC3)
    - `error keeps typed email and shows focused alert`
  - `language-card.test.tsx`:
    - `current locale pre-selected`
    - `selecting Русский calls setLocale("ru")` (S-005 AC2)
    - `save-failed toast when not persisted`
  - `data-card.test.tsx`:
    - `shows preparing state then success toast`
    - `error toast on failure`
- [ ] **Step 2: Run them and confirm they fail.** `npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.** `npm run -s lint && npm run -s typecheck && npm run -s test:unit && npm run -s build` → exit 0. `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(settings): language, data export and account deletion`

---

### Task 11: Resume upload UI, extraction status, replace and review-changes dialog

**Owner:** frontend-dev · **Story:** S-003 · **Wave:** 4 (needs Tasks 6 and 9)

**Files:**
- Create:
  - page and route: `apps/web/src/app/(onboarding)/onboarding/resume/page.tsx`, `apps/web/src/app/api/resume/route.ts`
  - lib: `apps/web/src/lib/resume/{validate,upload,status,actions}.ts`, `apps/web/src/lib/profile/merge.ts`
  - components: `apps/web/src/components/resume/{dropzone,upload-card,extraction-progress,extraction-failed,replace-resume-dialog,review-changes-dialog,filled-banner,resume-flow}.tsx`
- Modify: `apps/web/src/app/(onboarding)/onboarding/profile/page.tsx`, `apps/web/src/app/(app)/profile/page.tsx` (to pass the draft/banner/headerSlot), `apps/web/messages/{en,ru}/resume.json`
- Create tests: `apps/web/src/lib/resume/{validate,upload,status}.test.ts`, `apps/web/src/lib/profile/merge.test.ts`, `apps/web/src/app/api/resume/route.test.ts`, `apps/web/src/components/resume/{dropzone,review-changes-dialog,extraction-failed}.test.tsx`

**Interfaces:**
```ts
// lib/resume/validate.ts (pure)
export const RESUME_MAX_BYTES = 5_242_880;
export type ResumeFileError = "resume.unsupported_type" | "resume.too_large" | "resume.empty";
export function validateResumeFile(f: { name: string; size: number }): ResumeFileError | null;  // .pdf/.docx (case-insensitive)
// lib/resume/upload.ts (client)
export type UploadResult = { ok: true; resume: components["schemas"]["ResumeOut"] } | { ok: false; error: ResumeFileError | "network" | "unknown" };
export function uploadResume(file: File, opts: { onProgress?: (pct: number) => void; xhrFactory?: () => XMLHttpRequest }): Promise<UploadResult>;
//   XHR POST /api/resume, FormData field "file"; maps problem `code`
// app/api/resume/route.ts — POST: no session → 401; Content-Length > RESUME_MAX_BYTES + 65536 → 413 { code: "resume.too_large" } without
//   calling the API; otherwise forward the multipart body to POST /v1/resumes via createApiClient({ accessToken }) and return the
//   API's status + JSON
// lib/resume/actions.ts ("use server")
export async function retryResumeExtraction(resumeId: string): Promise<{ ok: boolean }>;   // POST /v1/resumes/{id}/extraction
// lib/resume/status.ts (client)
export type ResumeState = { id: string; fileName: string; status: "processing" | "ready" | "failed"; errorCode: "unreadable" | "ai_failed" | null; extracted: unknown | null };
export function pollResume(id: string, opts: { read: (id: string) => Promise<ResumeState>; intervalMs?: number; timeoutMs?: number;
  signal?: AbortSignal }): Promise<ResumeState | { status: "timeout" }>;   // defaults 2000 / 90000
export function extractionPhase(elapsedMs: number): 0 | 1 | 2;           // <20 s, <40 s, else
// lib/profile/merge.ts (pure)
export const DIFF_FIELDS = ["fullName","contactEmail","phone","location","links","targetTitles","headline","skills",
  "yearsExperience","experience","education","languages"] as const;   // application answers never come from a resume
export type DiffField = (typeof DIFF_FIELDS)[number];
export type FieldDiff = { field: DiffField; current: unknown; draft: unknown };
export function draftToProfileInput(extracted: unknown, base: ProfileInput): ProfileInput;   // lenient parse; bad values dropped
export function isProfileEmpty(p: ProfileInput): boolean;   // no field other than the defaulted contactEmail is set
export function diffProfile(current: ProfileInput, draft: ProfileInput): FieldDiff[];        // only fields that differ (order-insensitive for lists)
export function applyChoices(current: ProfileInput, draft: ProfileInput, choices: Partial<Record<DiffField, "keep" | "use">>): ProfileInput; // missing = keep
export function pendingDraft(profileSourceResumeId: string | null, resume: ResumeState | null): boolean;    // ready && id !== source
```
Behavior (S-003 §3a–3e):
- The upload step validates on the client before any request. Upload progress is determinate. Extraction progress is indeterminate, with the status line rotating by `extractionPhase` in an `aria-live="polite"` region.
- Timeout or `failed` → the failure panel "We couldn't read this resume" with the filename, "Try again" (`retryResumeExtraction` then poll) and "Fill in manually" (→ `/onboarding/profile`, with the file kept). The editor's `headerSlot` also shows the attached file and "Try again".
- `ready` → the profile page:
  - if `isProfileEmpty(saved)` → `ProfileEditor` gets `initial = draftToProfileInput(...)` with `sourceResumeId = resume.id` and `bannerFileName`;
  - else if `diffProfile` is empty → silently save with `sourceResumeId`;
  - else → the review dialog.
- The review dialog shows one `fieldset`/`legend` per differing field, with "Keep current" as the default, "Keep everything current", "Use everything new" and "Apply". The result goes to `applyChoices`, then the editor is remounted with it and `sourceResumeId`. Nothing is written until the user saves in the editor.
- "Replace resume" opens the upload flow in a `Dialog` from the editor.
- Profile pages read the current resume row through supabase-js (RLS read-own) server-side for the initial render, and client-side for polling.

- [ ] **Step 1: Write the failing tests**
  - `validate.test.ts`:
    - `pdf ok`, `DOCX uppercase ok`
    - `.doc → unsupported`, `.png → unsupported`
    - `exactly 5 242 880 ok`, `+1 → too_large`
    - `0 bytes → empty`
  - `upload.test.ts` (fake XHR):
    - `reports progress`
    - `202 → ok with resume`
    - `413 → too_large`
    - `422 unsupported → unsupported_type`
    - `network error → network`
  - `route.test.ts`:
    - `401 without session`
    - `oversized Content-Length → 413 and API never called` (S-003 AC2)
    - `forwards file and bearer token and returns the API status`
    - `maps an API problem code through`
  - `status.test.ts` (fake timers):
    - `resolves ready`
    - `resolves failed with errorCode` (AC3)
    - `times out after 90 s`
    - `phases switch at 20 s and 40 s`
  - `merge.test.ts`:
    - `identical draft → no diffs`
    - `different name → one diff`
    - `lists compare order-insensitively`
    - `applyChoices defaults to keep` (AC4)
    - `use takes the draft value`
    - `application answers are never overwritten`
    - `pendingDraft true only for ready and unapplied`
    - `isProfileEmpty ignores defaulted contact email`
  - `dropzone.test.tsx`:
    - `accessible name states PDF or DOCX up to 5 MB`
    - `Enter opens the file picker`
    - `rejected file shows "We only accept PDF or DOCX files" and sends nothing`
    - `over 5 MB shows "This file is larger than 5 MB"`
  - `review-changes-dialog.test.tsx`:
    - `lists only differing fields`
    - `Keep current preselected`
    - `Use everything new selects all`
    - `Apply returns choices`
    - `each group has a legend`
  - `extraction-failed.test.tsx`:
    - `shows filename stays attached with Try again and Fill in manually` (AC3)
- [ ] **Step 2: Run them and confirm they fail.** `npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.** `npm run -s lint && npm run -s typecheck && npm run -s test:unit && npm run -s build` → exit 0. `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** `feat(resume): upload flow with extraction status, failure fallback and review-before-overwrite`

---

### Task 12: E2E — auth, credits, Google edge states, EN/RU

**Owner:** qa-automation · **Story:** S-001, S-002, S-005 · **Wave:** 5 (serial: starts the app)

**Files:** Create `tests/e2e/auth/{sign-up,sign-in,password-reset,sign-out,google}.spec.ts`, `tests/e2e/i18n/{locale,no-missing-keys}.spec.ts`, `tests/e2e/a11y/auth-and-shell.a11y.spec.ts`

Preconditions: waves 1–4 are merged into the milestone branch. Then:
```bash
bash team/bin/app.sh stop && bash team/bin/app.sh start
```
The restart makes the worker and API run merged code. Locators are semantic, using EN/RU copy from the screen specs.

- [ ] **Step 1: Write the specs.** Each creates unique users.
  - `sign-up.spec.ts`:
    - `valid sign-up lands on the checklist with 20 credits and the welcome toast` (S-001 AC1; `ledgerRows` = one `signup_grant` of 20)
    - `duplicate email shows neutral message with Sign in and Reset password and creates no user` (AC2)
    - `malformed email and 7-char password show field errors and create no user` (AC3)
  - `sign-in.spec.ts`:
    - `wrong password and unknown email show the same "Invalid email or password"` (AC4)
    - `signing in again never adds credits` (AC7: the balance stays 20 and `ledgerRows` length stays 1 after sign-out → sign-in ×2)
    - `next param returns to the protected page`
  - `password-reset.spec.ts` (Mailpit):
    - `reset link sets a new password; old password fails; new works` (AC5)
    - `using the same link twice shows the expired panel` (AC5)
    - `a tampered token_hash shows the expired panel` (AC5)
  - `sign-out.spec.ts`: `after sign-out /profile, /settings and /onboarding redirect to /sign-in?next=…` (AC6)
  - `google.spec.ts`:
    - `Google button and divider are absent when not configured and email sign-in works` (S-002 AC3)
    - `returning with error=access_denied lands on sign-in with the neutral cancelled message and creates no user` (S-002 AC2: visit `/auth/callback?error=access_denied&error_description=…`)
  - `locale.spec.ts`:
    - `Accept-Language ru-RU renders Russian sign-up` (S-005 AC1; `test.use({ locale: "ru-RU" })`; `<html lang="ru">`)
    - `de-DE renders English` (AC1)
    - `switching to RU re-renders the page, validation messages are Russian, and the choice survives reload and a new browser context after sign-in` (AC2)
    - `reset email arrives in Russian after switching` (AC2; Mailpit)
  - `no-missing-keys.spec.ts` (S-005 AC3): for EN and RU, visit every M1 page reachable in this wave: `/sign-up`, `/sign-in`, `/sign-in/forgot-password`, `/reset-password?error=link_invalid`, `/onboarding`, `/onboarding/resume`, `/onboarding/profile`, `/profile`, `/settings`, `/account-deleted`, `/health`. Run `expectNoRawKeys`, and assert `collectMissingMessageErrors` is empty.
  - `auth-and-shell.a11y.spec.ts`: `expectNoSeriousA11yViolations` on sign-up, sign-in, forgot, reset (expired), onboarding and settings, in both the `chromium-desktop` and `chromium-mobile` projects; there is no horizontal scroll at 360 px.
- [ ] **Step 2: Run.** `npx playwright test tests/e2e/auth tests/e2e/i18n tests/e2e/a11y` → PASS. File failures as bugs on the board (`board.py new bug … --milestone M1 --owner <frontend-dev|backend-dev>`); do not change app code.
- [ ] **Step 3: Commit** `test(e2e): auth, credits, google edge states, en/ru and a11y journeys`

---

### Task 13: E2E — resume, profile, export and delete; full gate

**Owner:** qa-automation · **Story:** S-003, S-004, S-006 · **Wave:** 5 (serial, after Task 12)

**Files:** Create `tests/fixtures/resumes/*` (generated: `uv run --directory backend python tests/fixtures/resumes/make_fixtures.py --out ../tests/fixtures/resumes`, then `dd` a > 5 MiB `too-large.pdf`), `tests/e2e/resume/{upload,failure,replace}.spec.ts`, `tests/e2e/profile/manual.spec.ts`, `tests/e2e/account/{export,delete}.spec.ts`

- [ ] **Step 1: Write the specs**
  - `upload.spec.ts`: `PDF resume becomes an editable draft within 60 s with name, contacts, titles, skills, experience, education, languages, location and links` (S-003 AC1; `expect(...).toBeVisible({ timeout: 60_000 })`), plus the same for `resume.docx`.
  - `failure.spec.ts`:
    - `png and too-large files are rejected with the spec messages and nothing is stored` (AC2; `ledgerRows`-style admin check that no `resumes` row exists)
    - `scanned PDF shows "We couldn't read this resume", Fill in manually opens the editor, and the file stays attached` (AC3)
    - `ai-fail PDF shows the same failure and Try again is offered` (AC3)
  - `replace.spec.ts`: `with a saved profile, uploading resume-v2.docx opens Review changes with Keep current defaults; Apply with one Use new changes only that field after Save; the previous file is gone` (AC4)
  - `manual.spec.ts`:
    - `filling the five required fields saves and the checklist shows Done` (S-004 AC1)
    - `saving with missing fields and an invalid email highlights them and the profile stays incomplete` (AC2)
    - `application answers and phone persist after reload` (AC3)
    - `checklist lists exactly the missing fields` (AC4)
  - `export.spec.ts`: `Download my data saves autoapplier-export-<date>.json containing profile, searches, applications and credit_ledger for this user only` (S-006 AC1; `page.waitForEvent("download")`, then parse the JSON)
  - `delete.spec.ts`:
    - `typing the email and confirming deletes the account, shows the deleted page, and sign-in with old credentials fails; no rows or files remain` (AC2; admin checks)
    - `Cancel and Escape leave the account intact` (AC3)
  - Add `expectNoSeriousA11yViolations` on the upload step, the editor, the review dialog and the delete dialog.
- [ ] **Step 2: Run.** `npx playwright test tests/e2e/resume tests/e2e/profile tests/e2e/account` → PASS (file bugs as in Task 12).
- [ ] **Step 3: Full gate.** `bash team/bin/quality-gate.sh full` → `PASS`.
- [ ] **Step 4: Commit** `test(e2e): resume extraction, profile, export and deletion journeys`

---

## Waves

A wave's tasks touch disjoint feature files. Within a wave, **no task starts the app, resets or restarts Supabase, or creates migrations**; all tasks share the running local Supabase and Valkey through unique test data. The lead merges each finished worktree branch into `milestone/M1-onboarding-profile` (`merge --no-ff`), runs `bash team/bin/quality-gate.sh fast` after each merge, and does one joint review per wave.

| Wave | Tasks (parallel inside the wave) | Needs | Why this grouping |
|---|---|---|---|
| 1 | **T1** (backend-dev), alone | M0 merged | Changes `supabase/config.toml`, restarts Supabase, runs `db reset`; every later task builds on the schema and the generated DB types |
| 2 | **T2** (backend-dev), **T3** (backend-dev), **T4** (frontend-dev), **T5** (qa-automation) | T1 | Backend platform, AI/doc adapters, web platform and the qa harness are independent file sets |
| 3 | **T6** (backend-dev), **T7** (backend-dev), **T8** (frontend-dev), **T9** (frontend-dev) | T6: T2+T3 · T7: T2 · T8, T9: T4 | Feature APIs and the first feature screens |
| 4 | **T10** (frontend-dev), **T11** (frontend-dev) | T10: T4+T7 · T11: T6+T9 | These screens need the OpenAPI types from wave 3 (`schema.gen.ts`) and the editor from T9 |
| 5 | **T12** then **T13** (qa-automation), serial | all | Both start the app (`app.sh stop && start`) and run e2e; T13 ends with `quality-gate full` |

The lead creates each worktree outside the repo (constitution rule 6), for example:
```bash
git worktree add -b wt/M1-T2 /home/user/aa-wt/M1-T2 milestone/M1-onboarding-profile
```
Do not use Agent `isolation: "worktree"`. Every parallel implementer's first step inside its worktree:
```bash
npm ci && uv sync --directory backend --locked && python3 scripts/sync_env.py
```
Env files are git-ignored, so each worktree must generate its own. Supabase and Valkey are the shared instances started from the main working directory; check them with `bash scripts/supabase.sh status` and `bash scripts/valkey.sh status`, and **never** stop, start or reset them from a worktree.

Expected merge hotspots and how the lead resolves them:

| Files | Resolution |
|---|---|
| `backend/uv.lock`, `package-lock.json` | Never hand-merge: take the milestone side, then run `uv lock --directory backend` / `npm install` and commit. |
| `backend/openapi.json`, `apps/web/src/lib/api/schema.gen.ts` (T2, T6, T7) | Never hand-merge: run `npm run gen:api-types`, then `npm run check:openapi`. |
| `backend/pyproject.toml` (T2 and T3 add dependencies and import-linter entries) | Union of both sides. |
| `backend/src/autoapplier/wiring.py`, `api/app.py` (T6, T7) | Keep both sides' container fields and `include_router` lines. |
| `apps/web/package.json` (T4 only) and root `package.json` (T2 script, T5 devDeps) | Union. |
| `apps/web/messages/**` | Each task edits only its own namespace files (T4 pre-creates them all), so no conflicts are expected. |

## Traceability

| Story · AC | Task(s) | Tests (level) | Verification command |
|---|---|---|---|
| S-001 · 1 sign-up → signed in, checklist, balance 20 | 1, 4, 8, 9, 12 | `m1_accounts.test.sql` 1–2 (pgTAP); `test_auth_gotrue.py::test_email_signup_creates_profile_and_single_grant` (int); `actions.test.ts::signUp success…`, `site-header.test.tsx` (unit); `sign-up.spec.ts::valid sign-up…` (e2e) | `npm run -s test:db`; `uv run --directory backend pytest tests/integration/test_auth_gotrue.py -q`; `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/auth/sign-up.spec.ts` |
| S-001 · 2 duplicate email → no 2nd account, neutral message | 1, 8, 12 | `test_duplicate_signup_creates_no_second_user` (int); `errors.test.ts`, `actions.test.ts::signUp duplicate…`, `sign-up-form.test.tsx::duplicate alert…` (unit); `sign-up.spec.ts::duplicate email…` (e2e) | same as above |
| S-001 · 3 malformed email / < 8 chars → field errors, no account | 1, 8, 12 | `test_password_shorter_than_8_is_rejected` (int); `schemas.test.ts`, `actions.test.ts::signUp invalid…` (unit); `sign-up.spec.ts::malformed…` (e2e) | same as above |
| S-001 · 4 same generic error for wrong password and unknown email | 8, 12 | `errors.test.ts`, `actions.test.ts::signIn wrong password and unknown email…`, `sign-in-form.test.tsx` (unit); `sign-in.spec.ts::wrong password and unknown email…` (e2e) | `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/auth/sign-in.spec.ts` |
| S-001 · 5 reset via mail catcher; old password fails; expired/reused link rejected | 1, 8, 12 | `test_recovery_email_english_by_default` (int); `confirm/route.test.ts`, `actions.test.ts::updatePassword…`, `reset-password-form.test.tsx` (unit); `password-reset.spec.ts` ×3 (e2e, Mailpit) | `uv run --directory backend pytest tests/integration/test_auth_gotrue.py -q`; `npx playwright test tests/e2e/auth/password-reset.spec.ts` |
| S-001 · 6 sign out → protected pages redirect | 4, 8, 12 | `redirects.test.ts::decideProxyRedirect…`, `app-shell.test.tsx::account menu…` (unit); `sign-out.spec.ts` (e2e) | `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/auth/sign-out.spec.ts` |
| S-001 · 7 exactly one sign-up bonus; re-sign-in never grants | 1, 5, 12 | `m1_accounts.test.sql` 2–6 (pgTAP); `test_repeated_sign_in_never_grants_again` (int); `m1-ledger.test.ts` (black-box RLS); `sign-in.spec.ts::signing in again never adds credits` (e2e) | `npm run -s test:db`; `npx vitest run --config vitest.config.ts tests/integration/rls/m1-ledger.test.ts`; `npx playwright test tests/e2e/auth/sign-in.spec.ts` |
| S-002 · 1 Google creates or links account; bonus once for new | 1, 8 (+ human live check, D4) | `m1_accounts.test.sql` 3–4 (pgTAP: sign-in and identity linking add no grant); `actions.test.ts::startGoogle…`, `::exchangeOAuthCode new account adds welcome`, `oauth.test.ts::isNewAccount` (unit) | `npm run -s test:db`; `npm run test:unit -w @autoapplier/web`; manual: README live-check item (MR, TD-006) |
| S-002 · 2 cancel on consent → sign-in with neutral message, no account | 8, 12 | `oauth.test.ts::access_denied → oauth_cancelled`, `sign-in-form.test.tsx::oauth_cancelled notice…` (unit); `google.spec.ts::returning with error=access_denied…` (e2e) | `npx playwright test tests/e2e/auth/google.spec.ts` |
| S-002 · 3 not configured → button hidden, email works | 1, 8, 12 | `providers.test.ts` ×3, `sign-up-form.test.tsx::no Google button…` (unit); `google.spec.ts::Google button and divider are absent…` (e2e) | `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/auth/google.spec.ts` |
| S-003 · 1 PDF/DOCX ≤ 5 MB → editable draft within 60 s with all listed fields | 3, 6, 9, 11, 13 | `test_profile_draft.py`, `test_document_text_extractor.py`, `test_llm_provider_contract.py` (unit/contract); `test_resume_extraction.py::test_success…` (unit); `test_resume_pipeline.py::test_upload_then_extract_ready_under_60s` (int); `merge.test.ts`, `status.test.ts` (unit); `upload.spec.ts` PDF + DOCX (e2e) | `uv run --directory backend pytest tests/unit tests/contract -q`; `npm run -s test:integration:py`; `npx playwright test tests/e2e/resume/upload.spec.ts` |
| S-003 · 2 other type or > 5 MB rejected, nothing stored | 3, 6, 11, 13 | `test_resume_files.py`, `test_resume_service.py::test_png_as_pdf…/::test_one_byte_over…` (unit); `test_resumes_api.py::test_content_length_over_limit…` (unit); `test_resume_pipeline.py::test_rejected_upload_stores_nothing` (int); `validate.test.ts`, `route.test.ts::oversized…`, `dropzone.test.tsx` (unit); `failure.spec.ts::png and too-large…` (e2e) | `uv run --directory backend pytest tests/unit -q -k resume`; `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/resume/failure.spec.ts` |
| S-003 · 3 unreadable file or AI failure → message, manual fill, file stays | 3, 6, 11, 13 | `test_document_text_extractor.py::test_scanned…/::test_corrupt…`, `test_resume_extraction.py` (unreadable/ai_failed cases), `test_llm_fake_markers.py` (unit); `test_resume_pipeline.py::test_scanned_pdf_ends_unreadable_with_file_kept` (int); `extraction-failed.test.tsx`, `status.test.ts::resolves failed…` (unit); `failure.spec.ts` scanned + ai-fail (e2e) | same as above |
| S-003 · 4 re-upload replaces file; profile overwritten only after per-field confirm | 6, 11, 13 | `test_resume_service.py::test_replace_removes_previous_object_and_row`, `test_resume_repository.py::test_insert_current_demotes_previous` (unit/int); `merge.test.ts`, `review-changes-dialog.test.tsx` (unit); `replace.spec.ts` (e2e) | `npm run -s test:integration:py`; `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/resume/replace.spec.ts` |
| S-003 · 5 other user / anonymous cannot get the file | 1, 5, 6 | `m1_profiles_resumes.test.sql` 5–6 (pgTAP: bucket private, no user policies); `m1-storage.test.ts` (black-box as real users); `test_resumes_api.py::test_retry_other_users_resume_is_404`, `test_resume_repository.py::test_get_for_user_hides_other_users_rows` | `npm run -s test:db`; `npx vitest run --config vitest.config.ts tests/integration/rls/m1-storage.test.ts`; `npm run -s test:integration:py` |
| S-004 · 1 required fields → saved, checklist complete | 1, 9, 13 | `m1_profiles_resumes.test.sql` 1 (pgTAP `is_complete`); `completeness.test.ts`, `actions.test.ts::complete…`, `checklist.test.tsx::complete…` (unit); `manual.spec.ts::filling the five…` (e2e) | `npm run -s test:db`; `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/profile/manual.spec.ts` |
| S-004 · 2 missing/invalid → highlighted, stays incomplete | 1, 9, 13 | `m1_profiles_resumes.test.sql` 2 (check constraints); `schema.test.ts`, `actions.test.ts::format error…/::missing required only…`, `profile-editor.test.tsx::saving with missing fields…` (unit); `manual.spec.ts::saving with missing fields…` (e2e) | same as above |
| S-004 · 3 edits incl. application answers persist after reload | 1, 5, 9, 13 | `m1-profiles.test.ts::user upserts and reads own … application answers` (black-box); `schema.test.ts::toDbRow/fromDbRow round-trip…` (unit); `manual.spec.ts::application answers and phone persist…` (e2e) | `npx vitest run --config vitest.config.ts tests/integration/rls/m1-profiles.test.ts`; `npx playwright test tests/e2e/profile/manual.spec.ts` |
| S-004 · 4 checklist lists exactly what is missing | 9, 13 | `completeness.test.ts`, `checklist.test.tsx::partial shows exactly…`/`RU partial…` (unit); `manual.spec.ts::checklist lists exactly…` (e2e) | `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/profile/manual.spec.ts` |
| S-005 · 1 browser prefers Russian → RU, else EN | 4, 12 | `negotiate.test.ts` (unit); `locale.spec.ts::Accept-Language ru-RU…`/`de-DE…` (e2e) | `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/i18n/locale.spec.ts` |
| S-005 · 2 switch applies to pages, validation, emails; persists across sessions/devices | 1, 4, 8, 10, 12 | `m1_accounts.test.sql` 7 (locale mirror); `test_recovery_email_russian_after_locale_switch` (int); `actions.test.ts` (i18n), `language-switcher.test.tsx`, `language-card.test.tsx`, `actions.test.ts::signIn copies profile locale…` (unit); `locale.spec.ts::switching to RU…`, `::reset email arrives in Russian…` (e2e) | `npm run -s test:db`; `uv run --directory backend pytest tests/integration/test_auth_gotrue.py -q`; `npx playwright test tests/e2e/i18n/locale.spec.ts` |
| S-005 · 3 no missing translation key on any page in either language | 4, 12 | `messages.test.ts` key parity (unit); ESLint `i18next/no-literal-string` + `eslint-i18n.test.ts` (lint/unit); `no-missing-keys.spec.ts` (e2e, EN + RU) | `npm run -s lint`; `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/i18n/no-missing-keys.spec.ts` |
| S-006 · 1 export downloads JSON with profile, searches, applications, credit ledger | 7, 10, 13 | `test_account_api.py::test_export_headers_and_body_shape` (unit); `test_account_export.py` ×2 (int); `route.test.ts`, `export-client.test.ts`, `data-card.test.tsx` (unit); `export.spec.ts` (e2e) | `npm run -s test:integration:py`; `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/account/export.spec.ts` |
| S-006 · 2 typed-email confirm deletes account, profile, files, searches, connections, secrets; signed out; old credentials fail | 1, 7, 10, 13 | `m1_profiles_resumes.test.sql` 7 (cascade FKs); `test_account_deletion_service.py` (unit); `test_account_deletion.py::test_deletion_removes_everything`, `::test_every_user_owned_table_cascades` (int); `actions.test.ts::204 → signOut…`, `delete-account-dialog.test.tsx` (unit); `delete.spec.ts::typing the email…` (e2e). M1 has no searches, connections or secrets tables yet; the cascade and coverage tests fail automatically when M2–M4 add one without handling it (ADR-0016). | `npm run -s test:db`; `npm run -s test:integration:py`; `npx playwright test tests/e2e/account/delete.spec.ts` |
| S-006 · 3 cancel → nothing deleted | 7, 10, 13 | `test_account_deletion_service.py::test_mismatch_calls_nothing`, `test_account_deletion.py::test_mismatch_keeps_account` (unit/int); `delete-account-dialog.test.tsx::Cancel…/::Escape…` (unit); `delete.spec.ts::Cancel and Escape…` (e2e) | `npm run test:unit -w @autoapplier/web`; `npx playwright test tests/e2e/account/delete.spec.ts` |

Milestone gate: `bash team/bin/quality-gate.sh full` → PASS, then `python3 team/bin/board.py gate M1 --run-checks` → PASS.

## Notes for the Team Lead

- Execution order: wave 1 (T1) → wave 2 (T2, T3, T4, T5) → wave 3 (T6, T7, T8, T9) → wave 4 (T10, T11) → wave 5 (T12 → T13).
- T1 restarts local Supabase and runs `db reset`. Stop any running app and make sure nobody is testing at that moment.
- Record D1–D5 in the PRD decision log. Put a board note on S-004 for the designer to confirm the `profile.savedIncomplete` copy (D1). Escalate D5 (repeat sign-up bonus after deletion) with `needs_human`.
- Out of M1 scope, tracked in TECH-DEBT:
  - TD-004: OpenAI/OpenRouter adapters (M2);
  - TD-005: LCP measurement on a production build (MR);
  - TD-006: live Google OAuth check (MR, human).
