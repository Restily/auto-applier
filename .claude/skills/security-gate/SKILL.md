---
name: security-gate
description: "Security audit method — Strix pentest of the local app and source plus manual checks (RLS, authz, secrets, dependencies), finding triage into bugs, and the security report with verdict. Preloaded into security-auditor."
user-invocable: false
---

# Security gate

## 0. Preconditions
- `strix --version`, Docker running, and `LLM_API_KEY` set. The model is preset to Claude Sonnet (`STRIX_LLM` in `.claude/settings.json`), so the key is the only thing to supply; set it once and Strix caches it in `~/.strix/cli-config.json`. On a local/free backend (team/LOCAL-FREE.md) the settings profile sets `STRIX_LLM`/`LLM_API_BASE` and a placeholder key — that counts as configured. Missing key → do the manual checks (§2), `board.py set <MR> needs_human=true`, `board.py note <MR> "Strix not configured: LLM_API_KEY not set"`.
- App running: `bash team/bin/app.sh start`; URL from `app.sh url`; Supabase API at http://127.0.0.1:54321.
- Scope file (first run): `docs/security/scope.md` — in scope: `./` source, the app URL, the local Supabase API; out of scope: everything else; test accounts and roles; rules: no DoS, no data exfiltration outside the machine.

## 1. Strix
- Milestone check: `strix -n -t ./ -t <app-url> --scan-mode quick --instruction-file docs/security/scope.md`
- Release (MR): same without `--scan-mode quick` (full scan). Non-zero exit means findings; results in `strix_runs/<run>` (`strix view` for the dashboard).
- Only localhost/127.0.0.1 and local source are allowed (a hook blocks anything else).

## 2. Manual checks (always)
- RLS: every table in `public` has RLS enabled and policies (query via the `supabase-local` MCP or `supabase db lint`); test cross-user access for owned resources (IDOR).
- Auth: session handling, password reset/magic link flows, protected routes server-side, no auth decisions only in the client.
- Secrets: no keys in the repo or client bundle (`git grep -nE "(service_role|sk_live|SUPABASE_SERVICE_ROLE)"`, search the built client output); `.env*` git-ignored.
- Input/output: server-side validation, output encoding, file upload limits/types if any.
- Dependencies: `npm audit --omit=dev` (or the project's package manager) — high/critical only.
- Headers/config: basic security headers, CORS, cookies (`httpOnly`, `secure`, `sameSite`).

## 3. Triage
Only validated findings become bugs: `board.py new bug "[SEC] <component>: <issue>" --milestone <M> --severity <critical|high|medium|low> --owner <backend-dev|frontend-dev> --by security-auditor --body-file -` with impact, reproduction/PoC, affected files, remediation, references (CWE/OWASP). Map CVSS ≥ 9 → critical, 7–8.9 → high.
Re-test fixed findings; comment with `board.py note`.

## 4. Report — `board.py scaffold security <M>`
Scope, tools and run ids, findings table (id, severity, status), manual checklist results, residual risks and recommendations for production (the human's deployment checklist).
`Verdict: PASS` only if no open critical/high security bug remains and fixed findings were re-tested; otherwise `Verdict: FAIL`.
