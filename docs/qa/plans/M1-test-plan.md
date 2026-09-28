# Test plan M1

_Owner: QA Automation · 2026-09-27 · Plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md · Stories: S-001…S-006_

Third-party policy (verified against the plan): no live Google, no live LLM, no real email in any automated test. `APP_ENV=test` forces `LLM_PROVIDER=fake` (ADR-0006); Auth emails go only to Mailpit (`http://127.0.0.1:54324`); Google's real consent screen cannot be automated locally (ADR-0013 D4) — only button-visibility, redirect-start, callback-cancel/error mapping and the one-grant DB trigger are automated, the real round trip is a human pre-launch check (TD-006).

**Re-check, 2026-09-27 (same day):** the architect closed all 3 gaps below in `docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md` (commit `831df11`, board task T-005, `done`). Verified independently against the plan diff, not just T-005's self-report. **Verdict: PASS** — all 25 ACs now have a plan task with a concrete, runnable verification including the negative/edge cases this review asked for. The gap entries below are kept, marked resolved, for the audit trail.

## Contract review

All 25 ACs verified against the plan; the 3 gaps first found here (rows marked "closed" below) were fixed same-day — see the resolved list after the table.

| Story | AC | Plan task(s) | Verification in plan | OK? |
|---|---|---|---|---|
| S-001 | 1 sign-up → signed in, checklist, balance 20 | 1, 4, 8, 9, 12 | pgTAP `m1_accounts.test.sql` 1–2; `test_auth_gotrue.py::test_email_signup_creates_profile_and_single_grant`; `actions.test.ts`, `site-header.test.tsx`; `sign-up.spec.ts` | ✓ |
| S-001 | 2 duplicate email → no 2nd account, neutral message | 1, 8, 12 | `test_duplicate_signup_creates_no_second_user`; `errors.test.ts`, `actions.test.ts`, `sign-up-form.test.tsx`; `sign-up.spec.ts` | ✓ |
| S-001 | 3 malformed email / <8 chars → field errors, no account | 1, 8, 12 | `test_password_shorter_than_8_is_rejected`; `schemas.test.ts`, `actions.test.ts`; `sign-up.spec.ts` | ✓ |
| S-001 | 4 same generic error, wrong password / unknown email | 8, 12 | `errors.test.ts`, `actions.test.ts`, `sign-in-form.test.tsx`; `sign-in.spec.ts` | ✓ |
| S-001 | 5 reset via mail catcher; old password fails; expired/reused link rejected | 1, 8, 12 | `test_recovery_email_english_by_default`, `test_recovery_token_fresh_verifies`, `test_recovery_token_expired_is_rejected` (backdates `auth.users.recovery_sent_at`, verified live against GoTrue v2.197), `test_recovery_token_reused_is_rejected`, `test_recovery_token_unknown_is_rejected`; `confirm/route.test.ts`, `actions.test.ts`; `password-reset.spec.ts` | ✓ (Gap 1 closed) |
| S-001 | 6 sign out → protected pages redirect | 4, 8, 12 | `redirects.test.ts`, `app-shell.test.tsx`; `sign-out.spec.ts` | ✓ |
| S-001 | 7 exactly one sign-up bonus; re-sign-in never grants | 1, 5, 12 | pgTAP `m1_accounts.test.sql` 2–6; `test_repeated_sign_in_never_grants_again`; `m1-ledger.test.ts`; `sign-in.spec.ts` | ✓ |
| S-002 | 1 Google creates/links account; bonus once for new | 1, 8 (+ human live check, D4/TD-006) | pgTAP `m1_accounts.test.sql` 3–4; `actions.test.ts`, `oauth.test.ts::isNewAccount` | ✓ (manual-only for the real consent round trip, justified by D4) |
| S-002 | 2 cancel on consent → sign-in, neutral message, no account | 8, 12 | `oauth.test.ts`, `sign-in-form.test.tsx`; `google.spec.ts` | ✓ |
| S-002 | 3 not configured → button hidden, email works | 1, 8, 12 | `providers.test.ts`, `sign-up-form.test.tsx`; `google.spec.ts` | ✓ |
| S-003 | 1 PDF/DOCX ≤5MB → editable draft <60s, all fields | 3, 6, 9, 11, 13 | `test_profile_draft.py`, `test_document_text_extractor.py`, `test_llm_provider_contract.py`, `test_resume_extraction.py`; `test_resume_pipeline.py::test_upload_then_extract_ready_under_60s`; `merge.test.ts`, `status.test.ts`; `upload.spec.ts` (PDF + DOCX) | ✓ |
| S-003 | 2 other type / >5MB rejected, nothing stored | 3, 6, 11, 13 | `test_resume_files.py`, `test_resume_service.py`, `test_resumes_api.py`; `test_resume_pipeline.py::test_rejected_upload_stores_nothing`; `validate.test.ts`, `route.test.ts`, `dropzone.test.tsx`; `failure.spec.ts` | ✓ |
| S-003 | 3 unreadable / AI failure → message, manual fill, file stays | 3, 6, 11, 13 | `test_document_text_extractor.py`, `test_resume_extraction.py`, `test_llm_fake_markers.py`; `test_resume_pipeline.py::test_scanned_pdf_ends_unreadable_with_file_kept`; `extraction-failed.test.tsx`, `status.test.ts`; `failure.spec.ts` (scanned + ai-fail) | ✓ |
| S-003 | 4 re-upload replaces file; profile overwritten only after per-field confirm | 6, 11, 13 | `test_resume_service.py::test_replace_removes_previous_object_and_row`, `test_resume_repository.py::test_insert_current_demotes_previous`; `merge.test.ts`, `review-changes-dialog.test.tsx`; `replace.spec.ts` | ✓ |
| S-003 | 5 other user / anon cannot get the file | 1, 5, 6 | pgTAP `m1_profiles_resumes.test.sql` 3, 5–6 (now incl. `anon` select/insert/update/delete denied on `resumes` and `candidate_profiles`); `m1-storage.test.ts`; `test_resumes_api.py::test_retry_other_users_resume_is_404`, `test_resume_repository.py::test_get_for_user_hides_other_users_rows` (no e2e — by design, S-003 spec: no UI path can expose another user's file) | ✓ (Gap 3 closed) |
| S-004 | 1 required fields → saved, checklist complete | 1, 9, 13 | pgTAP `m1_profiles_resumes.test.sql` 1; `completeness.test.ts`, `actions.test.ts`, `checklist.test.tsx`; `manual.spec.ts` | ✓ |
| S-004 | 2 missing/invalid → highlighted, stays incomplete | 1, 9, 13 | pgTAP `m1_profiles_resumes.test.sql` 2 (now incl. length limits at N+1, shared `PROFILE_LIMITS`); `schema.test.ts` (table-driven `maxLength per field family`), `actions.test.ts` (incl. over-long fullName → `maxLength`, not `save_failed`), `profile-editor.test.tsx`; `manual.spec.ts` | ✓ (Gap 2 closed) |
| S-004 | 3 edits incl. application answers persist after reload | 1, 5, 9, 13 | `m1-profiles.test.ts`; `schema.test.ts::toDbRow/fromDbRow round-trip`; `manual.spec.ts` | ✓ |
| S-004 | 4 checklist lists exactly what is missing | 9, 13 | `completeness.test.ts`, `checklist.test.tsx`; `manual.spec.ts` | ✓ |
| S-005 | 1 browser prefers Russian → RU, else EN | 4, 12 | `negotiate.test.ts`; `locale.spec.ts` | ✓ |
| S-005 | 2 switch applies to pages/validation/emails; persists across sessions/devices | 1, 4, 8, 10, 12 | pgTAP `m1_accounts.test.sql` 7; `test_recovery_email_russian_after_locale_switch`; `language-switcher.test.tsx`, `language-card.test.tsx`, `actions.test.ts`; `locale.spec.ts` (incl. a fresh browser context after sign-in, proving device-independence) | ✓ |
| S-005 | 3 no missing translation key in either language | 4, 12 | `messages.test.ts` key-parity; ESLint `i18next/no-literal-string`; `no-missing-keys.spec.ts` (all M1 pages, EN+RU) | ✓ |
| S-006 | 1 export downloads JSON with profile/searches/applications/ledger | 7, 10, 13 | `test_account_api.py`, `test_account_export.py` ×2; `route.test.ts`, `export-client.test.ts`; `export.spec.ts` | ✓ |
| S-006 | 2 typed-email confirm → full deletion, signed out, old creds fail | 1, 7, 10, 13 | pgTAP `m1_profiles_resumes.test.sql` 7 (cascades); `test_account_deletion_service.py`, `test_account_deletion.py`; `delete-account-dialog.test.tsx`; `delete.spec.ts` | ✓ |
| S-006 | 3 cancel → nothing deleted | 7, 10, 13 | `test_account_deletion_service.py::test_mismatch_calls_nothing`, `test_account_deletion.py::test_mismatch_keeps_account`; `delete-account-dialog.test.tsx`; `delete.spec.ts` | ✓ |

**Gaps sent to architect (3, all now RESOLVED — closed same-day in commit `831df11`, board task T-005 `done`):**

1. ~~**§Task 1, Step 1, `test_auth_gotrue.py` list (S-001 AC5).**~~ Was: nothing produced a genuinely time-expired recovery token against real GoTrue (only reused + tampered were tested). **Closed:** `test_recovery_token_expired_is_rejected` backdates `auth.users.recovery_sent_at` (empirically verified as the field GoTrue v2.197 actually checks — `one_time_tokens.created_at` has no effect, recorded so a future GoTrue version fails loudly instead of silently), with a precondition proving the token row wasn't merely consumed, plus fresh/reused/unknown controls (`test_recovery_token_fresh_verifies`, `::reused`, `::unknown`).
2. ~~**§Task 9, Step 1, `schema.test.ts` (S-004 AC2, D1 "format errors").**~~ Was: no test for the string-length ceilings D1 names as a save-blocking format-error category. **Closed:** a shared `PROFILE_LIMITS` constant now exists in all three layers (SQL Task 1, zod Task 9, Python Task 3), each independently tested (`m1_profiles_resumes.test.sql` §2 at N+1, `schema.test.ts`'s table-driven `maxLength per field family`, `test_profile_draft.py::test_strings_truncated_to_profile_limits`), plus `actions.test.ts::over-long fullName → fieldErrors.fullName === "maxLength", no upsert, not save_failed` closing the exact UX-regression risk this gap named. Global Constraints now states explicitly: "A value that one side accepts and another rejects is a bug."
3. ~~**§Task 1, Step 1, `m1_profiles_resumes.test.sql` items 3 and 5 (S-003 AC5 + general RLS completeness).**~~ Was: no `anon` sub-case for `candidate_profiles`/`resumes`, no delete-denial case for `candidate_profiles`. **Closed:** item 3 gained `anon` (select/insert/update/delete denied) and an owner-delete-denied sub-case; item 5 gained the same `anon` sub-case for `resumes`; `m1_accounts.test.sql` item 7 additionally gained owner insert/delete-denied on `profiles` (a matrix cell this review had also flagged in the RLS matrix below, beyond the prose summary). `plan()` counts updated (`m1_accounts` 21, `m1_profiles_resumes` 45) so `pg_prove` fails loudly on any future mismatch.

No other gaps found. TDD ordering, data isolation (Postgres/Redis/Storage), the fakes-only third-party policy, and wave file/DB-state independence were all checked explicitly (see below) and are sound.

**Waves — file/state independence check:** genuinely disjoint except two config-file hotspots the plan already documents and resolves deterministically: `backend/pyproject.toml` (T2 + T3, wave 2 — union of both sides' deps/import-linter entries) and `backend/src/autoapplier/{wiring.py,api/app.py}` (T6 + T7, wave 3 — keep both sides' container fields/routers). Neither is a test-isolation risk (text-merge conflicts, not shared runtime/DB state); not counted as a gap. No wave task starts the app or resets the DB except Task 1 (alone, wave 1) and Tasks 12→13 (serial, wave 5, per the constitution's "kept serial" rule) — consistent.

**Data isolation check:** Postgres — unique `be+<uuid>@example.test` / `qa+<uuid>@example.test` per test, teardown deletes owned users, no resets outside Task 1. Redis — M1 tests avoid the real broker almost entirely (`InMemoryJobQueue` fake for unit/integration `resume.extract` tests); only Tasks 12–13's e2e suite exercises the real Celery→Valkey path, isolated by per-test unique resume/user ids rather than key prefixes (acceptable: Valkey here is pure transport, not test-owned data). Storage — object paths are `<user_id>/<resume_id>.<ext>`, inherently isolated by UUID. All sound.

**Strategy-doc correction (self, not a plan gap):** `docs/qa/TEST-STRATEGY.md`'s Performance-checks table still listed the LCP row as landing "M1 — first real page", which the accepted M1 plan / TECH-DEBT TD-004..006 / PRD decision log have since superseded (LCP verification moved to MR — TD-005, `next dev` isn't a production build). Corrected in that file as part of this review to keep the strategy doc in sync with the accepted plan; the M1 plan itself needed no change here.

## Coverage map

Level legend: **Unit** = Vitest/pytest with fakes/mocks · **Int** = pytest/Vitest(node) against local Supabase+Valkey · **RLS** = Vitest(node)+supabase-js as real throwaway users · **DB** = pgTAP · **e2e** = Playwright Test.

| Story·AC | Level | Test (file › name) |
|---|---|---|
| S-001·1 | DB | `m1_accounts.test.sql` §1 (locale from metadata), §2 (one grant of 20) |
| S-001·1 | Int | `test_auth_gotrue.py::test_email_signup_creates_profile_and_single_grant` |
| S-001·1 | Unit | `actions.test.ts::signUp success passes locale metadata and redirects…`; `site-header.test.tsx::signed-in shows "20 credits"` |
| S-001·1 | e2e | `sign-up.spec.ts::valid sign-up lands on the checklist with 20 credits and the welcome toast` |
| S-001·2 | Int | `test_auth_gotrue.py::test_duplicate_signup_creates_no_second_user` |
| S-001·2 | Unit | `errors.test.ts::user_already_exists → duplicate_email`; `actions.test.ts::signUp duplicate…`; `sign-up-form.test.tsx::duplicate alert shows message plus Sign in and Reset password buttons` |
| S-001·2 | e2e | `sign-up.spec.ts::duplicate email shows neutral message… and creates no user` |
| S-001·3 | Int | `test_auth_gotrue.py::test_password_shorter_than_8_is_rejected` |
| S-001·3 | Unit | `schemas.test.ts` (malformed email, 7-char password); `actions.test.ts::signUp invalid input returns fieldErrors and never calls Supabase` |
| S-001·3 | e2e | `sign-up.spec.ts::malformed email and 7-char password show field errors and create no user` |
| S-001·4 | Unit | `errors.test.ts::invalid_credentials and user_not_found and email_not_confirmed → invalid_credentials`; `actions.test.ts::signIn wrong password and unknown email yield the same invalid_credentials`; `sign-in-form.test.tsx::invalid credentials alert gets focus and both fields get danger state` |
| S-001·4 | e2e | `sign-in.spec.ts::wrong password and unknown email show the same "Invalid email or password"` |
| S-001·5 | Int | `test_auth_gotrue.py::test_recovery_email_english_by_default` |
| S-001·5 | Unit | `confirm/route.test.ts` (valid token, `verifyOtp` error → `link_invalid`, unsafe `next`); `actions.test.ts::updatePassword signs out globally and redirects with notice`; `reset-password-form.test.tsx` |
| S-001·5 | e2e | `password-reset.spec.ts` ×3 (new password works / old fails, same link twice → expired panel, tampered `token_hash` → expired panel) |
| S-001·5 | Int (added) | `test_recovery_token_expired_is_rejected` (real time-based expiry via `auth.users.recovery_sent_at`), `::fresh_verifies`, `::reused_is_rejected`, `::unknown_is_rejected` — **Gap 1 closed** |
| S-001·6 | Unit | `redirects.test.ts::decideProxyRedirect…`; `app-shell.test.tsx::account menu has Settings and Sign out` |
| S-001·6 | e2e | `sign-out.spec.ts::after sign-out /profile, /settings and /onboarding redirect to /sign-in?next=…` |
| S-001·7 | DB | `m1_accounts.test.sql` §2–6 (grant uniqueness, sign-in/identity-linking add no row, cross-user RLS on `credit_ledger`) |
| S-001·7 | Int | `test_auth_gotrue.py::test_repeated_sign_in_never_grants_again` |
| S-001·7 | RLS | `m1-ledger.test.ts` (new user = one grant, balance 20, sign-in again adds no row, no write access, no cross-user read) |
| S-001·7 | e2e | `sign-in.spec.ts::signing in again never adds credits` |
| S-002·1 | DB | `m1_accounts.test.sql` §3 (sign-in adds no row), §4 (identity linking adds no row) |
| S-002·1 | Unit | `actions.test.ts::startGoogle…`, `::exchangeOAuthCode new account adds welcome`; `oauth.test.ts::isNewAccount boundaries` |
| S-002·1 | Manual | real Google consent round trip — human pre-launch check (D4, TD-006); not automated by design |
| S-002·2 | Unit | `oauth.test.ts::access_denied → oauth_cancelled`; `sign-in-form.test.tsx::oauth_cancelled notice renders neutral alert` |
| S-002·2 | e2e | `google.spec.ts::returning with error=access_denied lands on sign-in with the neutral cancelled message and creates no user` |
| S-002·3 | Unit | `providers.test.ts` ×3; `sign-up-form.test.tsx::no Google button or divider when google=false` |
| S-002·3 | e2e | `google.spec.ts::Google button and divider are absent when not configured and email sign-in works` |
| S-003·1 | Unit | `test_profile_draft.py`, `test_document_text_extractor.py`, `test_llm_fake_markers.py`; `test_resume_extraction.py::test_success_marks_ready_with_normalized_fixture_draft`; `merge.test.ts`, `status.test.ts::resolves ready` |
| S-003·1 | Contract | `test_llm_provider_contract.py` (fake + anthropic-on-fixtures) |
| S-003·1 | Int | `test_resume_pipeline.py::test_upload_then_extract_ready_under_60s` (PDF, timed) |
| S-003·1 | e2e | `upload.spec.ts` (PDF and DOCX, `toBeVisible({timeout: 60_000})`) |
| S-003·2 | Unit | `test_resume_files.py` (8 sniffing cases); `test_resume_service.py::test_png_as_pdf_rejected_before_any_io/::test_one_byte_over_rejected_too_large`; `test_resumes_api.py::test_content_length_over_limit_rejected_before_parsing`; `validate.test.ts`, `route.test.ts::oversized…`, `dropzone.test.tsx` |
| S-003·2 | Int | `test_resume_pipeline.py::test_rejected_upload_stores_nothing` |
| S-003·2 | e2e | `failure.spec.ts::png and too-large files are rejected… nothing is stored` |
| S-003·3 | Unit | `test_document_text_extractor.py::test_scanned_pdf_text_is_not_readable/::test_corrupt_and_encrypted_pdf_raise_unreadable`; `test_resume_extraction.py` (unreadable/ai_failed cases); `extraction-failed.test.tsx`, `status.test.ts::resolves failed with errorCode` |
| S-003·3 | Int | `test_resume_pipeline.py::test_scanned_pdf_ends_unreadable_with_file_kept` |
| S-003·3 | e2e | `failure.spec.ts` (scanned PDF, ai-fail PDF) |
| S-003·4 | Unit | `test_resume_service.py::test_replace_removes_previous_object_and_row`; `merge.test.ts`, `review-changes-dialog.test.tsx` |
| S-003·4 | Int | `test_resume_repository.py::test_insert_current_demotes_previous` |
| S-003·4 | e2e | `replace.spec.ts` (Review changes, Keep-current default, Apply with one field changed) |
| S-003·5 | DB | `m1_profiles_resumes.test.sql` §3, §5 (own-only, 42501 on writes; `anon` select/insert/update/delete denied — **Gap 3 closed**), §6 (no storage policy for the bucket) |
| S-003·5 | RLS | `m1-storage.test.ts` (owner/other/anon download denied, no public URL) |
| S-003·5 | Int | `test_resumes_api.py::test_retry_other_users_resume_is_404`, `test_resume_repository.py::test_get_for_user_hides_other_users_rows` |
| S-003·5 | e2e | none — by design (S-003 spec: no UI path can expose another user's file) |
| S-004·1 | DB | `m1_profiles_resumes.test.sql` §1 (`is_complete` truth table) |
| S-004·1 | Unit | `completeness.test.ts`; `actions.test.ts::complete → ok isComplete true`; `checklist.test.tsx::complete shows Done…` |
| S-004·1 | e2e | `manual.spec.ts::filling the five required fields saves and the checklist shows Done` |
| S-004·2 | DB | `m1_profiles_resumes.test.sql` §2 (check-constraint violations) |
| S-004·2 | Unit | `schema.test.ts` (email/URL/salaryRange/maxItems, table-driven `maxLength per field family` — **Gap 2 closed**); `actions.test.ts::format error → fieldErrors and no upsert`, `::over-long fullName → maxLength, not save_failed`; `profile-editor.test.tsx::saving with missing fields shows every missing error and focuses the first` |
| S-004·2 | e2e | `manual.spec.ts::saving with missing fields and an invalid email highlights them and the profile stays incomplete` |
| S-004·3 | RLS | `m1-profiles.test.ts::user upserts and reads own candidate_profiles incl. application answers` |
| S-004·3 | Unit | `schema.test.ts::toDbRow/fromDbRow round-trip keeps application answers and phone` |
| S-004·3 | e2e | `manual.spec.ts::application answers and phone persist after reload` |
| S-004·4 | Unit | `completeness.test.ts`; `checklist.test.tsx::partial shows exactly "Missing: contact email, at least one skill"` (+ RU) |
| S-004·4 | e2e | `manual.spec.ts::checklist lists exactly the missing fields` |
| S-005·1 | Unit | `negotiate.test.ts` (9 Accept-Language cases) |
| S-005·1 | e2e | `locale.spec.ts::Accept-Language ru-RU renders Russian sign-up`, `::de-DE renders English` |
| S-005·2 | DB | `m1_accounts.test.sql` §7 (locale mirrors to `auth.users`) |
| S-005·2 | Int | `test_auth_gotrue.py::test_recovery_email_russian_after_locale_switch` |
| S-005·2 | Unit | `actions.test.ts` (i18n), `language-switcher.test.tsx`, `language-card.test.tsx`, `actions.test.ts::signIn copies profile locale into the cookie` |
| S-005·2 | e2e | `locale.spec.ts::switching to RU… survives reload and a new browser context after sign-in`, `::reset email arrives in Russian…` |
| S-005·3 | Unit | `messages.test.ts` (key-parity, no empty values); lint `i18next/no-literal-string`; `eslint-i18n.test.ts` |
| S-005·3 | e2e | `no-missing-keys.spec.ts` (11 pages × EN/RU, `expectNoRawKeys` + `collectMissingMessageErrors`) |
| S-006·1 | Unit | `test_account_api.py::test_export_headers_and_body_shape`; `route.test.ts`, `export-client.test.ts`, `data-card.test.tsx` |
| S-006·1 | Int | `test_account_export.py::test_export_contains_only_callers_rows`, `::test_export_covers_every_user_owned_table` |
| S-006·1 | e2e | `export.spec.ts` (downloaded JSON parsed and checked) |
| S-006·2 | DB | `m1_profiles_resumes.test.sql` §7 (every FK to `auth.users` cascades) |
| S-006·2 | Unit | `test_account_deletion_service.py` (order, idempotency, failure handling); `delete-account-dialog.test.tsx` |
| S-006·2 | Int | `test_account_deletion.py::test_deletion_removes_everything`, `::test_every_user_owned_table_cascades` |
| S-006·2 | e2e | `delete.spec.ts::typing the email and confirming deletes the account…` |
| S-006·3 | Unit | `test_account_deletion_service.py::test_mismatch_calls_nothing`; `delete-account-dialog.test.tsx::Cancel…/::Escape…` |
| S-006·3 | Int | `test_account_deletion.py::test_mismatch_keeps_account` |
| S-006·3 | e2e | `delete.spec.ts::Cancel and Escape leave the account intact` |

## e2e journeys

Wave 5, against the merged, restarted app (`app.sh stop && start`), Chromium desktop + mobile (360px) projects, semantic locators, unique data per test:

1. **Sign-up → onboarding → credits** (`tests/e2e/auth/sign-up.spec.ts`) — valid sign-up, duplicate email, invalid input.
2. **Sign-in edge cases and credit non-duplication** (`sign-in.spec.ts`) — wrong credentials, repeated sign-in, `?next=`.
3. **Password reset via Mailpit** (`password-reset.spec.ts`) — link works once, old password fails, reused/tampered link rejected.
4. **Sign-out and route guarding** (`sign-out.spec.ts`).
5. **Google edge states without live Google** (`google.spec.ts`) — hidden button, cancelled consent.
6. **Locale detection and switching** (`i18n/locale.spec.ts`) — Accept-Language default, explicit switch, cross-device persistence, localized reset email.
7. **No missing i18n keys** (`i18n/no-missing-keys.spec.ts`) — every M1 page, EN+RU.
8. **a11y smoke** (`a11y/auth-and-shell.a11y.spec.ts`, `+` resume/profile/account dialogs in Task 13) — zero serious/critical axe violations, desktop + mobile.
9. **Resume upload → AI draft** (`resume/upload.spec.ts`) — PDF and DOCX within 60s, all fields present.
10. **Resume failure paths** (`resume/failure.spec.ts`) — rejected type/size, scanned PDF, AI failure, file stays attached.
11. **Resume replace with review-before-overwrite** (`resume/replace.spec.ts`).
12. **Manual profile fill and edit** (`profile/manual.spec.ts`) — required fields, validation, persistence, checklist copy.
13. **Data export** (`account/export.spec.ts`).
14. **Account deletion and cancel** (`account/delete.spec.ts`).

## RLS matrix

Legend: ✓ tested & allowed · ✗ tested & denied (evidence cited) · — no policy/grant exists by design, not independently exercised as its own case. (All cells previously marked ⚠ were closed same-day by the architect — see Contract review gap 3.)

| Table / bucket | anon | owner (self) | other authenticated user |
|---|---|---|---|
| `profiles` | select ✗ (`m1_accounts.test.sql` §8) · insert/update/delete — (revoked) | select ✓ · update `ui_locale` ✓, other columns ✗ `42501` (`m1_accounts.test.sql` §7, `m1-profiles.test.ts`) · insert ✗ `42501` · delete ✗ `42501` (`m1_accounts.test.sql` §7, added — **Gap 3 closed**) | update → 0 rows ✗ (`m1_accounts.test.sql` §7) · select/insert/delete — |
| `credit_ledger` / `credit_balances` | select ✗ (`m1_accounts.test.sql` §8) · insert/update/delete — | select ✓ (balance 20) · insert/update/delete ✗ `42501` (`m1_accounts.test.sql` §6, `m1-ledger.test.ts`) | select → 0 rows ✗ (`m1_accounts.test.sql` §6, `m1-ledger.test.ts`) · writes — |
| `resumes` | select ✗ · insert/update/delete ✗ `42501` (`m1_profiles_resumes.test.sql` §5, added — **Gap 3 closed**) | select ✓ · insert/update/delete ✗ `42501`, backend-only (`m1_profiles_resumes.test.sql` §5) | select → 0 rows ✗ (`test_resume_repository.py`, `m1_profiles_resumes.test.sql` §5) |
| `candidate_profiles` | select ✗ · insert/update/delete ✗ `42501` (`m1_profiles_resumes.test.sql` §3, added — **Gap 3 closed**) | select ✓ · insert ✓ · update ✓ (version++/`updated_at`) · delete ✗ `42501` (`m1_profiles_resumes.test.sql` §3, added, no delete policy/grant exists — **Gap 3 closed**) | select → 0 rows ✗ · insert with `user_id=B` → RLS violation ✗ (`m1_profiles_resumes.test.sql` §3) |
| Storage bucket `resumes` | download/list/upload ✗, public URL doesn't serve ✗ (`m1-storage.test.ts`) | download/upload/list ✗ — **no user policy exists at all**, backend secret key only (`m1_profiles_resumes.test.sql` §6, `m1-storage.test.ts`) | download ✗ (`m1-storage.test.ts`) |

## Negative / edge cases

From the plan's own Review Focus (already covered, cited by task):
- **Spoofed/edge-case resume files** — PNG renamed `.pdf`, ZIP without `word/document.xml`, exactly 5,242,880 bytes vs one byte more, empty file, encrypted/corrupt PDF, `Content-Length` of 100MB. Tasks 3, 6, 11.
- **Worker down / extraction hangs** — 90s stale-`processing` retry, client failure panel after 90s. Task 6 (`test_retry_stale_processing`), Task 11 (`status.test.ts`).
- **Cross-user access by id** — resume retry, export rows, Storage download, `candidate_profiles` read. Tasks 5, 6, 7.
- **Open redirect via `?next=`** — `//evil.test`, `https://evil.test`, `/\evil.test`, `javascript:…`. Task 4 (`redirects.test.ts`), Task 8 (`confirm/route.test.ts`).
- **Forged/expired/algorithm-confused JWTs** — `alg: none`, HS256-with-public-key, wrong `aud`/`iss`, past `exp`, unknown `kid`; token never echoed in body/logs. Task 2.

Cases this review flagged as missing, now in the plan (closed same-day, commit `831df11`):
- A recovery token whose expiry has actually elapsed (not just reused/tampered) is rejected by real GoTrue — `test_recovery_token_expired_is_rejected`. (Gap 1)
- Each string-length ceiling in Global Constraints' Data limits table (`full_name`, `headline`, `phone`, `location`, skill/title item length, entry text, `work_authorization_other`) is format-blocked by `profileFormatSchema` with `maxLength`, not just caught later by the DB — `schema.test.ts`'s table-driven case. (Gap 2)
- `anon` gets 0 rows/denied on `candidate_profiles` and `resumes` directly, and an owner cannot `delete` their own `candidate_profiles` row (nor `profiles`) — `m1_profiles_resumes.test.sql` §3/§5, `m1_accounts.test.sql` §7. (Gap 3)

## Test data

- Backend tests: `be+<uuid4>@example.test`, admin-created via `supabase_helpers.make_user`, deleted on teardown.
- QA/e2e/RLS tests: `qa+<uuid4>@example.test`, via `tests/integration/helpers/supabase.ts::createTestUser` / `tests/e2e/fixtures/test.ts`'s `newUser` fixture, deleted after.
- Redis/Valkey: unit and integration `resume.extract` tests use `InMemoryJobQueue` (no real broker touched); only wave-5 e2e exercises the real Celery→Valkey path, isolated by per-test unique resume/user ids.
- Storage: object paths `<user_id>/<resume_id>.<pdf|docx>` — isolated by UUID; no shared fixture object is ever mutated (the one admin-uploaded fixture in `m1-storage.test.ts` is read-only in that test).
- Static fixtures: `backend/tests/fixtures/resumes/*` (generated by `make_fixtures.py`: text PDF/DOCX, `ai-fail.pdf`, `scanned.pdf`, `encrypted.pdf`, `corrupt.pdf`, `png-renamed.pdf`, etc.), copied to `tests/fixtures/resumes/` for e2e plus a generated `too-large.pdf` (Task 13).
- Mail: Mailpit at `127.0.0.1:54324`, queried via `waitForEmail`/`extractLink` — never a real SMTP/inbox.
- LLM: `LLM_PROVIDER=fake` everywhere except `test_llm_provider_contract.py`'s `anthropic` param, which hits `respx`-mocked fixtures, never `api.anthropic.com`.
- No test truncates, resets, or `FLUSHALL`s shared state; only Task 1 (wave 1, alone) runs `supabase db reset`, once.
