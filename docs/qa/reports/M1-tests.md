# Automated test report M1

_Owner: QA Automation · 2026-10-04 · Plan: docs/qa/plans/M1-test-plan.md · Stories S-001…S-006, bugs B-001…B-003_

Verdict: PASS

All suites are green; every AC of S-001…S-006 maps to at least one automated test (one AC, S-002·1, is automated only up to the Google consent screen and the real round trip is a justified manual pre-launch check, TD-006); no fixme, no skipped-by-quarantine tests, no new flaky tests. The 2026-10-04 re-run against the restarted worker (T-028, resume parsing in a killable child process) is green on both Playwright projects.

## Summary

Last full gate (`bash team/bin/quality-gate.sh full`, logs `.team/state/gate-*.log`, run before the app restart) plus today's targeted re-runs against the restarted app/worker.

| Level | Added in M1 | Total (last full gate) | Passed | Failed | Duration |
|---|---|---|---|---|---|
| Lint / typecheck (ruff, mypy, import-linter, ESLint incl. `i18next/no-literal-string`, tsc) | n/a | gate steps | PASS | 0 | 4-6 s each |
| Backend unit (pytest `tests/unit`) | M1-new (resume, account, profile, LLM fake, subprocess extractor, valkey script, ...) | 233 | 233 | 0 | 8.4 s |
| Backend contract (pytest `tests/contract/llm`: LLM provider contract, fake vs. interface) | M1-new | 14 | 14 | 0 | 1.2 s |
| Web unit/component (Vitest, jsdom) | M1-new | 459 (62 files) | 459 | 0 | 50 s |
| Backend integration (pytest, live Supabase + Valkey + GoTrue + Storage) | M1-new | 64 | 64 | 0 | 31.5 s |
| DB / RLS (pgTAP: `m1_accounts`, `m1_profiles_resumes`, `rls_default`) | M1-new | 102 assertions (3 files) | 102 | 0 | ~1 s |
| Web integration (Vitest node: storage RLS, ledger, profiles, CI workflow, Playwright config contract) | M1-new | 38 (6 files) | 38 | 0 | 2.7 s |
| Build (Next.js production build) | n/a | gate step | PASS | 0 | ~30 s |
| e2e (Playwright, `chromium-desktop` + `chromium-mobile`, a11y via axe) | M1-new | 144 | 141 | 0 | 6.9 min |
| &nbsp;&nbsp;of which conditional skips | | 3 | | | |

Pyramid shape (tests, excluding lint/build): unit/component 706 (233 + 14 + 459), integration/DB 204 (64 + 102 + 38), e2e 144 (141 run + 3 skipped); about 70 / 20 / 10 overall, as the strategy intends.

The 3 skips are the desktop variants of `touch targets (T-008) > primary actions are at least 44x44 on /sign-up, /sign-in, /onboarding` (`tests/e2e/a11y/auth-and-shell.a11y.spec.ts:75`, `test.skip(project !== "chromium-mobile")`): the touch-target contract (T-008) is a mobile-only rule, the same three run and pass on `chromium-mobile`. A conditional skip by design, not a quarantine.

### Re-runs on 2026-10-04 against the restarted app (new worker, T-028)

Run against the already-running app (`reuseExistingServer`), no restart, no DB reset, unique data per test (parallel with qa-manual/designer sessions). Logs: `.team/state/e2e-m1-rerun.log`, `.team/state/backend-pytest-m1-rerun.log`.

| Command | Result |
|---|---|
| `npx playwright test tests/e2e/resume tests/e2e/profile` | **36 passed**, 0 failed, 0 skipped, 0 retries, 4.2 min: 18 `chromium-desktop` + 18 `chromium-mobile` (resume: upload x2 formats, failure x5, replace, discard-edits x3 = 11 per project; profile: manual x5, salary x2 = 7 per project) |
| `cd backend && uv run pytest` | **311 passed** in 42 s (233 unit + 64 integration + 14 contract; separately re-run: unit 233 in 8.9 s, integration 64 in 33 s, contract 14 in 1.2 s) |
| `uv run pytest -k "subprocess or killable or child"` | 8 passed, incl. the 6 new `tests/unit/test_subprocess_document_extractor.py` cases |
| `uv run pytest tests/unit --cov=autoapplier.domain --cov=autoapplier.services` | 233 passed, **95% line coverage** (target >= 70%); `resume_extraction.py` 98%, `resumes.py` 94% |

New subprocess extractor tests (T-028, M1 review round 2 N1, failing-first per the backend owner): `test_parses_pdf_and_docx_in_a_child_process`, `test_unreadable_document_raises_unreadable` (parametrized), `test_child_crash_is_unreadable_not_a_timeout`, `test_never_returning_parse_is_killed_at_the_parse_timeout`, `test_cancelling_the_await_kills_the_child`, `test_hung_parse_fails_row_and_leaves_nothing_behind` (row ends failed/ai_failed and no live thread/process remains). The end-to-end path through the real restarted worker is exercised by `tests/e2e/resume/upload.spec.ts` (PDF + DOCX, both projects, within the 60 s budget) and `failure.spec.ts` (scanned PDF, ai-fail, renamed PNG).

Note on counts: the 3 conditional skips were in the full gate only; the targeted re-run contains none.

## AC coverage

Legend: **U** unit/component, **I** integration (API/DB/Vitest-node), **DB** pgTAP, **E** e2e (Playwright). Bare file names are relative to `backend/tests/`, `apps/web/src/`, `supabase/tests/database/` and `tests/e2e/` (`.py`, `.test.ts(x)`, `.test.sql`, `.spec.ts` respectively); the full test lists per AC are in the plan's contract-review table, only the load-bearing ones are repeated here.

| Story | AC | Automated tests | Level | Note |
|---|---|---|---|---|
| S-001 | 1 sign-up -> signed in, checklist, balance 20 | `m1_accounts.test.sql` 1-2; `integration/test_auth_gotrue.py::test_email_signup_creates_profile_and_single_grant`; `lib/auth/actions.test.ts`, `site-header.test.tsx`; `auth/sign-up.spec.ts` | U I DB E | |
| S-001 | 2 duplicate email -> no 2nd account, neutral message | `test_duplicate_signup_creates_no_second_user`; `errors.test.ts`, `actions.test.ts`, `sign-up-form.test.tsx`; `auth/sign-up.spec.ts` | U I E | |
| S-001 | 3 malformed email / <8 chars -> field errors, no account | `test_password_shorter_than_8_is_rejected`; `schemas.test.ts`, `actions.test.ts`; `auth/sign-up.spec.ts` | U I E | |
| S-001 | 4 same generic error for wrong password / unknown email | `errors.test.ts`, `actions.test.ts`, `sign-in-form.test.tsx`; `auth/sign-in.spec.ts` | U E | |
| S-001 | 5 reset via mail catcher; old password fails; expired/reused link rejected | `test_recovery_email_english_by_default`, `test_recovery_token_fresh_verifies`, `_expired_is_rejected` (backdated against real GoTrue), `_reused_is_rejected`, `_unknown_is_rejected`; `confirm/route.test.ts`, `actions.test.ts`; `auth/password-reset.spec.ts` | U I E | |
| S-001 | 6 sign out -> protected pages redirect | `redirects.test.ts`, `app-shell.test.tsx`; `auth/sign-out.spec.ts` | U E | |
| S-001 | 7 exactly one 20-credit bonus; none for an account re-created with a deleted account's email; re-sign-in never grants | `m1_accounts.test.sql` 2-6 and section 9; `test_repeated_sign_in_never_grants_again`, `test_resignup_after_deletion_gets_no_bonus`, `test_signup_after_unrelated_deletion_still_gets_bonus` (control), `test_account_deletion.py::test_signup_after_deletion_gets_account_without_bonus`; `tests/integration/rls/m1-ledger.test.ts`; `auth/sign-in.spec.ts`; `account/delete.spec.ts::after deletion, signing up again...` | I DB E | |
| S-002 | 1 Google creates/links account; bonus once for new | `m1_accounts.test.sql` 3-4 (one-grant trigger); `actions.test.ts`, `oauth.test.ts::isNewAccount`; `auth/google.spec.ts` (button visible, redirect starts) | U DB E (partial) | **Manual-only for the real consent round trip**: GoTrue discovers Google's OIDC endpoints, no local fake is possible (ADR-0013 D4, TD-006); a human pre-launch check is required |
| S-002 | 2 cancel on consent -> sign-in, neutral message, no account | `oauth.test.ts`, `sign-in-form.test.tsx`; `auth/google.spec.ts` | U E | |
| S-002 | 3 not configured -> button hidden, email works | `providers.test.ts`, `sign-up-form.test.tsx`; `auth/google.spec.ts` | U E | |
| S-003 | 1 PDF/DOCX <=5 MB -> editable draft <60 s, all fields | `unit/test_profile_draft.py`, `test_document_text_extractor.py`, `test_subprocess_document_extractor.py`, `test_resume_extraction.py`; `contract` LLM provider contract; `integration/test_resume_pipeline.py::test_upload_then_extract_ready_under_60s`; `merge.test.ts`, `status.test.ts`; `resume/upload.spec.ts` (PDF + DOCX) | U I E | re-run today vs restarted worker: 4/4 pass (2 formats x 2 projects) |
| S-003 | 2 other type / >5 MB rejected, nothing stored | `test_resume_files.py`, `test_resume_service.py`, `test_resumes_api.py`; `test_resume_pipeline.py::test_rejected_upload_stores_nothing`; `validate.test.ts`, `api/resume/route.test.ts`, `dropzone.test.tsx`; `resume/failure.spec.ts` (png, too-large, server-side 413, PNG renamed .pdf) | U I E | |
| S-003 | 3 unreadable / AI failure -> message, manual fill, file stays | `test_document_text_extractor.py`, `test_subprocess_document_extractor.py` (crash/hang -> unreadable), `test_resume_extraction.py`, `test_llm_fake_markers.py`; `test_resume_pipeline.py::test_scanned_pdf_ends_unreadable_with_file_kept`; `extraction-failed.test.tsx`; `resume/failure.spec.ts` (scanned, ai-fail + Try again) | U I E | |
| S-003 | 4 re-upload replaces file; profile overwritten only after per-field confirm | `test_resume_service.py::test_replace_removes_previous_object_and_row`, `test_resume_repository.py::test_insert_current_demotes_previous`; `merge.test.ts`, `review-changes-dialog.test.tsx`; `resume/replace.spec.ts`, `resume/discard-edits.spec.ts` (dirty-editor guard) | U I E | |
| S-003 | 5 other user / anon cannot get the file | `m1_profiles_resumes.test.sql` 3, 5-6 (anon + other user, all four verbs); `tests/integration/rls/m1-storage.test.ts`; `test_resumes_api.py::test_retry_other_users_resume_is_404`, `test_resume_repository.py::test_get_for_user_hides_other_users_rows` | U I DB | No e2e by design: no UI path can expose another user's file |
| S-004 | 1 required fields -> saved, checklist complete | `m1_profiles_resumes.test.sql` 1; `completeness.test.ts`, `actions.test.ts`, `checklist.test.tsx`; `profile/manual.spec.ts` | U DB E | |
| S-004 | 2 missing/invalid -> highlighted, stays incomplete | `m1_profiles_resumes.test.sql` 2 (limits at N+1); `schema.test.ts`, `actions.test.ts`, `profile-editor.test.tsx`; `profile/manual.spec.ts`, `profile/salary.spec.ts` (EN + RU upper bound) | U DB E | |
| S-004 | 3 edits incl. application answers persist after reload | `tests/integration/rls/m1-profiles.test.ts`; `schema.test.ts` round-trip; `profile/manual.spec.ts::application answers and phone persist after reload` | U I E | |
| S-004 | 4 checklist lists exactly what is missing | `completeness.test.ts`, `checklist.test.tsx`; `profile/manual.spec.ts::checklist lists exactly the missing fields` | U E | |
| S-005 | 1 browser prefers Russian -> RU, else EN | `negotiate.test.ts`; `i18n/locale.spec.ts` (ru-RU, de-DE) | U E | |
| S-005 | 2 switch applies to pages/validation/emails; persists across sessions/devices | `m1_accounts.test.sql` 7; `test_recovery_email_russian_after_locale_switch`; `language-switcher.test.tsx`, `language-card.test.tsx`, `actions.test.ts`; `i18n/locale.spec.ts` (incl. fresh browser context, reset email in RU) | U I DB E | |
| S-005 | 3 no missing translation key in either language | `messages.test.ts` key parity; ESLint `i18next/no-literal-string`; `i18n/no-missing-keys.spec.ts` (all M1 pages, EN + RU, public + signed-in) | U E | |
| S-006 | 1 export downloads JSON with profile/searches/applications/ledger | `test_account_api.py`, `integration/test_account_export.py`; `route.test.ts`, `export-client.test.ts`; `account/export.spec.ts` | U I E | |
| S-006 | 2 typed-email confirm -> full deletion, signed out, old creds fail; only the email HMAC remains | `m1_profiles_resumes.test.sql` 7 (cascades), `m1_accounts.test.sql` section 9; `test_account_deletion_service.py`; `integration/test_account_deletion.py` incl. `::test_deletion_keeps_only_email_fingerprint`, `::test_failed_deletion_leaves_no_fingerprint`; `delete-account-dialog.test.tsx`; `account/delete.spec.ts` | U I DB E | |
| S-006 | 3 cancel -> nothing deleted | `test_account_deletion_service.py::test_mismatch_calls_nothing`, `test_account_deletion.py::test_mismatch_keeps_account`; `delete-account-dialog.test.tsx`; `account/delete.spec.ts` | U I E | |
| T-006 | CI pins Supabase CLI 2.118.0; quality job with `APP_ENV=ci` + `LLM_PROVIDER=fake` | `tests/integration/ci-workflow.test.ts` (2 cases); `unit/test_config.py::test_ci_env_requires_fake_llm` | U I | |
| T-008 | Button >= 44 px touch target; mobile project has touch + mobile UA at 360x740 | `components/ui/button.test.tsx`; `tests/integration/playwright-config.test.ts`; `a11y/auth-and-shell.a11y.spec.ts` (mobile project, rendered box) | U I E | desktop variants skip by design |
| T-009 | `scripts/**` linted/type-checked; `valkey.sh` fails fast | `unit/test_valkey_script.py` x4; lint/mypy probes | U | |
| T-028 | resume parse is killable; no live thread/process after a hang | `unit/test_subprocess_document_extractor.py` x6 (see above); e2e `resume/upload.spec.ts`, `failure.spec.ts` through the real worker | U E | Hardening not tied to a story AC (M1 review round 2 N1). Residual risk in TD-011 / TD-012 |

All 25 story ACs (S-001 x7, S-002 x3, S-003 x5, S-004 x4, S-005 x3, S-006 x3) plus the 4 task ACs above have an automated test. Board AC checks are the verifier's (qa-manual), not recorded here.

## Failures and bugs

No failing test in the last full gate or in today's re-runs. No new product defect found in this pass.

Regression tests for the three M1 bugs (all in `qa`, fixed by frontend-dev/backend-dev, each test failed before the fix per the owners' log):

| Bug | Defect | Regression tests | Level | Status |
|---|---|---|---|---|
| B-001 | Dialog/Sheet close button hardcoded English "Close" | `components/ui/dialog.test.tsx` (`is named <<Закрыть>> under the ru locale (B-001)`, footer close, override, `showCloseButton=false`), `components/ui/sheet.test.tsx` | U | pass (ui suite 13/13) |
| B-002 | Reset email ignored the user's language | `lib/auth/actions.test.ts` (`B-002: an explicit current language is passed via the redirectTo lang marker`, `...without an explicit choice no lang marker`); e2e `i18n/locale.spec.ts::reset email arrives in Russian after switching` and `::an account created from a Russian browser gets the Russian reset email` (the earlier `test.fixme` is gone; T-025 template landed) | U E | pass (both projects in the full gate) |
| B-003 | Language chosen before sign-in discarded / account value overrode it | `lib/auth/actions.test.ts` (3 sign-in cases, OAuth adopt case, pending-choice-beats-cookie case), `i18n/actions.test.ts` (pending marker set signed-out, not when signed-in); e2e `i18n/locale.spec.ts::language precedence: a language chosen before sign-in is not lost when the account has another one` | U E | pass (both projects) |

## fixme / quarantine

None. `grep -rn "fixme\|test.skip" tests/e2e` finds only the by-design mobile-only skip in `a11y/auth-and-shell.a11y.spec.ts:75` (3 desktop skips). No `T-` quarantine task is open.

## Coverage

- Backend `domain` + `services` (the logic target): **95%** lines (463 stmts, 23 missed), measured today with `pytest-cov`; target >= 70% met. `npm run test:coverage:py` reproduces it.
- Web `lib/*.ts`: Vitest `v8` provider is still not wired into `test:unit` (the M0 follow-up "wire coverage" is only done for the backend). AC-traceability, not a percentage, is the binding gate for the web side; carried to MR.
- Suite duration: fast gate (lint, typecheck, unit) about 1 min; integration about 35 s; build about 30 s; full e2e 6.9 min (both projects, fully parallel). The resume+profile subset is 4.2 min.

## Known gaps and risks (none blocks the verdict)

1. **Chunked / streamed upload cap** (S-003 AC2, review item 9): the "no Content-Length, cut off while streaming" path is covered only at unit level (`api/resume/route.test.ts`, asserts the stream is not read past the cap). e2e covers the `Content-Length` path (`failure.spec.ts`: server returns 413 `resume.too_large`); a true chunked-transfer e2e through the real Next.js server is not automated.
2. **Google OAuth success path** (TD-006, S-002 AC1): only the button, redirect start, cancel/error mapping and the one-grant DB trigger are automated; the real consent round trip needs a human check before launch.
3. **LCP < 2.5 s** (TD-005): not measured; the app runs `next dev` under `app.sh`. Needs a production-build perf run, planned for MR.
4. **Parse child hardening** (TD-011, TD-012): no `RLIMIT_AS`/`RLIMIT_CPU`/`PDEATHSIG` on the resume parse child, and unknown child exit codes map to `unreadable` without a log line. The wall-clock kill and no-leak guarantee (N1) are tested; the memory-bomb and orphaned-child cases are not.
5. Web coverage gate not wired (see Coverage).
6. Fixtures: scanned PDF, ai-fail and large files are synthesised in `tests/e2e/resume/support.ts`; real-world resume layouts are only as good as the fake LLM's deterministic output (`LLM_PROVIDER=fake`, ADR-0006). Real-LLM quality is not tested in CI by policy.

## Flakiness notes

- No flaky test observed in the full gate, in today's 36-test re-run, or in the three backend re-runs; retries are 0 locally (1 in CI, config `retries: CI ? 1 : 0`), no test relied on a retry.
- The re-run executed while qa-manual and designer used the same app and DB: all tests use unique emails (`freshCreds` / `newUser` fixtures), no global reset, so no cross-talk was seen. Keep it that way: any new e2e must create its own user.
- Timing-sensitive points, none flaky so far: resume upload to Ready (budget 60 s, fake LLM answers in a few seconds); the reset-email tests poll Mailpit by recipient with `waitForEmail` (no sleeps); the recovery-token expiry test depends on GoTrue v2.197 checking `auth.users.recovery_sent_at` and would fail loudly, not silently, on a different behaviour after an upgrade.
- Backend integration (64 tests, 31-35 s) needs live Supabase + Valkey; if either is down the run fails at the fixtures, not as flaky assertions.

## Reproduce

```
bash team/bin/quality-gate.sh full                       # logs in .team/state/gate-*.log
npx playwright test tests/e2e/resume tests/e2e/profile   # against the running app
cd backend && uv run pytest                              # unit + integration + contract
```
