# M1 whole-branch code review (round 1)

_2026-10-04 · Reviewer: fresh opus subagent · Scope: `git diff bfb0092..HEAD` (code only)_

**Verdict: CHANGES REQUIRED.** There are 2 Important findings, both in the resume extraction pipeline.

No data leaks were found:
- RLS is on every new table, and the private bucket has no policies.
- The JWT check pins the algorithm and checks aud/iss/role.
- `as_user` uses SET LOCAL inside a transaction.
- `safeNextPath` covers both auth callbacks.
- The D5 HMAC is computed in SQL with a Vault key over lower(btrim(email)).
- The credit grant is exactly-once through the unique ledger key.
- The export runs under RLS.

| # | Sev | Where | Finding | Fix → task |
|---|---|---|---|---|
| 1 | Important | db/resumes.py, celery_factory.py, pypdf_docx.py | A DOCX zip bomb or a hanging PDF OOM-kills the worker. `acks_late` plus reject-on-lost re-queues it, and attempts are never capped, so it loops forever and stalls the queue. | Cap attempts, add task time limits, guard the uncompressed DOCX size → T-026 |
| 2 | Important | services/resume_extraction.py, db/resumes.py, web status.ts / resume-flow.tsx | One attempt can run about 135 s while the UI gives up at 90 s. "Try again" then gets a 409 and stops polling, or runs a second extraction alongside. | Whole-attempt `asyncio.timeout` → T-026; web resumes polling on 409 → T-027 |
| 3 | Minor | domain/profile.py:102 | `urlparse` raises on `http://[x`, so the row stays `processing` forever. | Catch it in `_url`, plus a catch-all in `extract()` → T-026 |
| 4 | Minor | web profile/schema.ts | A salary above int4 passes zod and the DB rejects it with a generic error. | Add `.max(2147483647)` → T-027 |
| 5 | Minor | m1_profiles_resumes.sql | `links` keys and lengths and unknown entry keys are not enforced in SQL. | Validate in `touch_candidate_profile` → T-026 |
| 6 | Minor | services/account_deletion.py | The 502 says "nothing removed" after the purge has already run, and a file uploaded mid-deletion is orphaned. | Correct the message and re-purge after the Auth delete → T-026 |
| 7 | Minor | web lib/auth/actions.ts | The OAuth callback reads the locale after the session exchange, so a RU visitor is stored as `en`. | Resolve the locale before the exchange → T-027 |
| 8 | Minor | adapters/auth/jwt_verifier.py | An unknown `kid` forces a JWKS fetch on every request. | Rate-limit refetches → T-026 |
| 9 | Minor | api/routes/resumes.py; web api/resume/route.ts | The size guard only reads Content-Length, so a chunked body bypasses it. | Count bytes while streaming → T-026, T-027 |
| 10 | Minor | config.toml / web updatePasswordAction | A non-recovery session can change the password without reauthentication. | Gate the action on a recovery session (AMR) → T-027 |
| 11 | Minor | test_resume_repository.py | Disabling the trigger autocommits on the shared DB. | One transaction, or `session_replication_role` → T-026 |
| 12 | Minor | db/resumes.py | `select *` / `returning *`. | List the columns → T-026 |
| 13 | Minor | profile-resume-host.tsx | Replacing the resume mid-edit discards unsaved input silently. | Warn when the editor is dirty, or merge → T-027 |
| 14 | Minor | ui/progress.tsx | No `aria-valuenow`. | Pass the value → T-027 |
| 15 | Minor | ui/sidebar.tsx, ui/command.tsx | Hardcoded English sr strings in components that are unused today. | TECH-DEBT: localize before first use |

## Round 2 (re-review of fd7203a..HEAD)

_2026-10-04 · Reviewer: fresh opus subagent · Scope: `git diff fd7203a..HEAD -- . ':!docs'` (dd8da99 backend T-026; c317065 + 754fa14 web T-027)_

Evidence:
- `uv run pytest tests/unit`: 225 passed.
- `vitest run` over src/lib, src/components/{resume,profile}, ui/progress and src/app/api: 35 files, 313 tests passed.
- A standalone script showed that `asyncio.timeout` around `asyncio.to_thread` returns at the deadline while the worker thread keeps running (see N1).

### Round-1 findings

| # | Status | Note |
|---|---|---|
| 1 | partially | **Crash loop:** fixed. One-statement claim with the cap: the 4th claim fails the row (`unreadable`), and an integration test covers it.<br>**Zip bomb:** fixed. The guard checks the declared uncompressed size, which is sound because CPython's `ZipExtFile` truncates reads at `file_size`.<br>**Hanging PDF:** not fixed. See N1: the whole-attempt timeout returns early, so the 75 s hard limit never fires and the parser thread lives on in the worker child. |
| 2 | fixed | A whole-attempt `asyncio.timeout(55 s)` leaves the row `failed/ai_failed`. 55 s < 60 s soft < 75 s hard < 90 s stale window, and the claim bumps `updated_at` (trigger), so a retry cannot overlap. The web resumes polling on 409 in both `resume-flow` and `profile-resume-host`. `status.test.ts` pins `POLL_TIMEOUT_MS` against both Python constants. |
| 3 | fixed | `_url` catches `ValueError`. `extract()` has a catch-all that logs only the exception type (no PII) and fails a claimed row. |
| 4 | fixed | `.max(INT4_MAX, "maxValue")` on min and max. `maxValue` is in EN and RU and in `VALIDATION_KEYS`. Min has an id and is in the focus order. (Minor a11y nit: N2.) |
| 5 | fixed | The new migration differs from the original trigger body only in the added checks. Allowed keys match the web shapes: links `linkedin/portfolio`; experience `title/company/start/end/current/description`; education `institution/degree/field/endYear`; languages `name/level`. |
| 6 | fixed | The 502 text is corrected. Purge steps re-run after the Auth delete and only log on failure. A late upload hits the FK on insert and removes its own object. |
| 7 | fixed | The locale is resolved before the exchange (pending cookie → NEXT_LOCALE → Accept-Language). The pending cookie is cleared and NEXT_LOCALE is set for new accounts. |
| 8 | fixed | Unknown-`kid` refetch is limited to one per 30 s. `_last_attempt_at` is set before the first await, so concurrent requests don't stampede. (N4 is an accepted side effect.) |
| 9 | fixed | **Backend:** counts bytes while streaming, then replays the buffer to the handler.<br>**Web:** `readBodyWithin` cancels the stream past 5 MiB + 64 KiB, then parses `formData` from the buffer. |
| 10 | fixed | `updatePasswordAction` is gated on `isRecoverySession` (amr[0] ∈ {recovery, otp}). Email confirmations are disabled and `/auth/confirm` accepts only `type=recovery`, so `otp` currently means the recovery link (accepted). (Freshness nit: N3.) |
| 11 | fixed | The test now uses `set local session_replication_role = replica` inside one transaction. No autocommitted DDL. |
| 12 | fixed | No `select *` / `returning *` is left in `db/resumes.py`. |
| 13 | fixed | `onDirtyChange` feeds a ref, and fill/review on a dirty editor opens `DiscardEditsDialog`. Focus goes to the safe "Keep my edits" button; Esc and the backdrop keep the edits. EN/RU strings match. "Keep" leaves `sourceResumeId` unchanged, so the resume is offered again on the next load, as the copy says. |
| 14 | fixed | `value` is passed to the Radix Root, so `aria-valuenow` is rendered, and a test covers it. |

### New findings

| Sev | Where | Finding | Suggested fix |
|---|---|---|---|
| Important | backend/src/autoapplier/services/resume_extraction.py:64,94; worker/tasks/resume.py:11 | **N1. A hanging PDF is still not contained.** Parsing runs in `asyncio.to_thread`. When the 55 s `asyncio.timeout` fires, it only cancels the await: the row is marked failed and the task returns normally through the persistent `AsyncRuntime` loop. The parser thread keeps spinning in the loop's default executor. Because the task has already finished, the 75 s hard `time_limit` (documented as "kills a child stuck in native code (a hanging parser)") never fires. Each malicious PDF (pypdf has had several infinite-loop CVEs) leaks one CPU-bound thread per worker child. After min(32, cpu+4) of them the executor is saturated: every later `to_thread` call queues forever, and every extraction in that child times out as `ai_failed`. That is a cheap per-user DoS of the queue, which is the case round-1 #1 asked to close. | Make the parse killable. One option: run `extract_text` in a child process (e.g. a `ProcessPoolExecutor`/`multiprocessing` with terminate on deadline). Another: after the deadline, if the parse future is not done, mark the row failed and then end the process (raise out of the task / `os._exit`, or block so the hard limit kills the child; acks_on_failure_or_timeout acks it). Add a test with a never-returning fake extractor that asserts no thread or executor work is left behind, or that the process-exit path is taken. |
| Minor | apps/web/src/components/profile/salary-fields.tsx:41,56 | **N2.** When both Min and Max have errors, only the Max message is shown (`error ?? minError`), but Min's `aria-describedby` points at that message. A screen reader then announces the wrong reason for Min. | Render two messages (separate ids), or give Min its own describedby. |
| Minor | apps/web/src/lib/auth/recovery.ts | **N3.** There is no freshness bound. The recovery-link session is a normal long-lived session and refresh keeps `amr=otp`, so for its whole lifetime it can change the password again without the old one. | Also require `amr[0].timestamp` within N minutes (e.g. 15), as the GoTrue reauthentication guidance does. |
| Minor | backend/src/autoapplier/adapters/auth/jwt_verifier.py:_key_for | **N4.** A forged unknown `kid` refetch sets `_last_attempt_at`. A real rotation landing within the next 30 s then gets 401 until the window passes. This is an accepted tradeoff of #8, recorded for awareness. | None needed now. Optionally skip the rate limit when the last refetch actually changed the key set. |

Only N1 blocks approval. N2–N4 are non-blocking (they can go to TECH-DEBT or a follow-up task).

**Round 2 verdict: CHANGES REQUIRED**
