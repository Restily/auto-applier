# ADR-0001: Web stack, UI component library and repository layout

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
The human fixed TypeScript + Next.js (App Router) with a ready-made component library for the web app, Supabase for Postgres/Auth/Storage and Python for everything behind the API (see ADR-0002). The web app must meet WCAG 2.2 AA, support widths 360–1440 px, and use EN/RU UI. The team is AI agents: the stack must be well documented, testable with Vitest and Playwright, and must not need licenses outside MIT/Apache/BSD/ISC/PSF (MPL-2.0 unmodified).
Versions were checked against the npm registry on 2026-09-27 (context7 quota was exhausted, so release notes were read directly).

## Options considered
1. **Next.js 16 App Router + Tailwind CSS v4 + shadcn/ui (Radix primitives)**: the constitution default, code-owned components (copied into the repo, fully themeable with the designer's tokens), accessible primitives.
2. Next.js + MUI or Mantine: complete kits, but a runtime theme layer on top of the designer's CSS tokens, heavier bundles, and harder to match a custom design system.
3. Vite SPA + React Router: simpler build, but loses server components/server actions and server-side Supabase session handling.

## Decision
- **Monorepo with npm workspaces** (`apps/web`, later `apps/extension`) plus a **uv project in `backend/`**. npm (bundled with Node 22) avoids pnpm's install-script approval friction; `package-lock.json` is committed and `npm ci` is used in CI.
- **Web:** Next.js **16.3.x** (App Router, Turbopack default, `proxy.ts` instead of `middleware.ts`), React **19.x**, TypeScript **~6.0** (pinned below 6.1 because typescript-eslint 8.x supports `<6.1`; TypeScript 7 is not yet supported by the lint toolchain), Tailwind CSS **4.x** (CSS-first config), **shadcn/ui** (CLI 4.x) components in `apps/web/src/components/ui`, `lucide-react` icons, `zod` 4 for env and form validation, `@supabase/ssr` + `@supabase/supabase-js` for auth/session and RLS-guarded reads.
- **Design tokens:** the designer owns `docs/design/tokens.css` (CSS custom properties) and `docs/design/design-system/<slug>/MASTER.md`. The web app **imports** `docs/design/tokens.css` from `apps/web/src/app/globals.css` (no copies) and maps tokens to Tailwind (`@theme inline`) and shadcn semantic variables. `turbopack.root` is the repository root so the import resolves.
- **Lint:** ESLint **9.x** flat config with `eslint-config-next` (core-web-vitals + typescript). ESLint 10 is not yet supported by eslint-plugin-react/import. Architecture boundaries are enforced by `no-restricted-imports` and `import/no-restricted-paths` with fix-it messages (see ARCHITECTURE.md → Modules and layering).
- **Tests:** Vitest 5 + Testing Library + jsdom for web unit/component tests; Playwright Test pinned to **1.56.1** for e2e (see ADR-0011 for the reason).
- **API client:** `openapi-typescript` generates types from the FastAPI OpenAPI document (`backend/openapi.json`), `openapi-fetch` calls the API from server code only.

## Consequences
- Positive: components live in the repo and follow the tokens; server components keep secrets and the API URL on the server; typed contracts end to end (DB types from Supabase, API types from OpenAPI).
- Negative: two toolchains (npm + uv) in one repo; root scripts must fan out to both (scripts contract in ARCHITECTURE.md). TypeScript and ESLint are pinned below their latest majors; upgrade when typescript-eslint/eslint-plugin-react support them (TECH-DEBT TD-002).
- Follow-ups: `apps/extension` joins the npm workspace in M4 (ADR-0005); root scripts pick it up via `--workspaces --if-present`.
