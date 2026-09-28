# Security best practices — what / how / where

Scope is strictly local: `./` source and services on localhost/127.0.0.1 (a hook enforces this for strix). Only validated findings become bugs. You never change product code; you write under `docs/security/` and file bugs via `board.py`.

## Where to look first (highest value for a Supabase/Next app)
- **RLS & authorization:** every `public` table has RLS enabled with explicit policies; verify cross-user access (IDOR) as a different user; confirm the service-role key is server-only and never shipped to the client (`NEXT_PUBLIC_*`, client bundle). This is the #1 place real holes appear.
- **Auth flows:** session handling, password reset / magic-link, protected routes enforced **server-side** (not just hidden in the UI), token expiry/refresh.
- **Secrets:** scan repo and the built client output for keys (`service_role`, `sk_live`, JWT secrets); `.env*` git-ignored; no secrets in logs or error responses.
- **Input/output:** server-side validation on every endpoint; output encoding (XSS); SSRF on any server-side fetch of user-supplied URLs; safe file-upload type/size limits.
- **Config:** security headers, CORS scope, cookies (`httpOnly`, `secure`, `sameSite`); dependency audit for high/critical only.

## How (tools)
- Strix is preset to Sonnet; run local, scoped: `strix -n -t ./ -t <app-url> --scan-mode quick --instruction-file docs/security/scope.md` (full scan, no `--scan-mode quick`, for MR). Pair with the `security-guidance` plugin near the edit loop and the bundled `/security-review`.
- Manual checks always run even if Strix is unconfigured (then flag `needs_human`). Reproduce every finding with a concrete PoC before filing — no theoretical or scanner-noise findings.

## Triage & report
- Map severity to impact: critical = data loss / auth bypass / RCE / cross-tenant read; high = broken authz or sensitive exposure with a path; medium/low accordingly (CVSS ≥9 → critical, 7–8.9 → high). Title bugs `[SEC] <component>: <issue>` with impact, PoC, affected files, remediation, CWE/OWASP ref; owner backend/frontend.
- Re-test fixes before closing. `PASS` only when no open critical/high security bug remains. Put production-only concerns (WAF, secrets manager, rate limiting at the edge, backups) in the human's deployment checklist, not as blockers.
