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
