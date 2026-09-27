# ADR-0011: Local runtime, environment and dependency policy

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
Everything must run via `bash team/bin/app.sh start` on a 4 vCPU/16 GB cloud VM (Node 22, Python 3.11 + uv, Docker, Chromium 1194 preinstalled at `/opt/pw-browsers`), and in GitHub Actions. Supabase is local only. The team needs one start command, one URL, deterministic env and a license-safe dependency set.

## Options considered
Process orchestration: 1. **`concurrently` (MIT) from the root `npm run dev`** starting web, API and worker. 2. Docker Compose for app processes (slower dev loop, duplicate of Supabase's Docker). 3. honcho/foreman Procfile (extra Python/Ruby tool).
Env: A. **Generate env files from `supabase status -o env` + committed `.env.example` files** (script). B. Hard-code local keys (breaks when the CLI changes key formats).

## Decision
- **`npm run dev`** (= `APP_START_CMD`) runs `python3 scripts/sync_env.py` then `concurrently` with `api` (uvicorn on `127.0.0.1:8000`), `worker` (`python -m autoapplier.worker`) and `web` (Next.js on `:3000`). `app.sh` readiness path is **`/api/health`** on the web app, which is 200 only when web → API → DB and queue are all OK.
- **Local Supabase** via the CLI (`supabase` binary on PATH, else `npx -y supabase`; wrapper `scripts/supabase.sh`). The Supabase CLI is **not** an npm dependency (its postinstall downloads a binary from GitHub releases, which the cloud VM blocks). `SUPABASE_START_ARGS="-x studio,imgproxy,vector,logflare"` to save RAM. The auth mail catcher of the local stack doubles as the SMTP sink for fake email sending.
- **Env files:** committed `backend/.env.example` and `apps/web/.env.example`; `scripts/sync_env.py` creates git-ignored `backend/.env` and `apps/web/.env.local`, filling Supabase URL/keys/DB URL from `supabase status -o env` and generating local-only secrets (e.g. `APP_ENCRYPTION_KEYS`) once. No real third-party keys are ever required; providers default to fakes.
- **Ports:** web 3000, API 8000, Supabase API 54321, Postgres 54322, mail UI 54324.
- **Playwright Test pinned to 1.56.1** so it uses the preinstalled Chromium revision 1194 (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) without downloads; CI installs the matching browser with `npx playwright install --with-deps chromium`. Next.js builds to `.next-build` (`NEXT_DIST_DIR`) so `next build` can run while `next dev` serves the app.
- **Dependency policy:** only MIT, Apache-2.0, BSD, ISC, PSF (MPL-2.0 unmodified) — **no GPL/AGPL/LGPL** (this excludes psycopg/psycopg2, Pyrogram). New dependencies are checked on npm/PyPI before adding; exact lockfiles committed (`package-lock.json`, `backend/uv.lock`).

## Consequences
- Positive: one command, three processes, Supabase as the only container stack; env never hand-edited; no browser downloads in the VM.
- Negative: Playwright is several minors behind latest (1.56.1 vs 1.63.0) (TECH-DEBT TD-002); `concurrently` output interleaves logs (prefixed by name).
- Follow-ups: automated license check (TECH-DEBT TD-003) before MR.
