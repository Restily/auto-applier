# Roles, tools and add-ons

Installed by default = in `.claude/settings.json` / `team/bin/setup.sh`. Add-ons are proven alternatives; don't stack competing methodologies (superpowers, gstack, BMAD, compound-engineering, spec-kit) — they fight over the same workflow. Borrow ideas, pick one engine.

## Team Lead — main session (opus)
- **Does:** kickoff with the human, PRD/roadmap, orchestration, triage, gates, merges, retros.
- **Default tools:** `/mvp-*` skills · superpowers `brainstorming`, `subagent-driven-development` · built-in `/goal` (autopilot) · board.py.
- **Add-ons:** gstack `/office-hours` and `/plan-ceo-review` (sharper product framing) · claude-mem (personal cross-session recall; the repo stays the source of truth) · dynamic workflows (`ultracode`) for huge fan-outs (e.g. regression over dozens of stories).

## Architect — `architect` (opus, effort high, project memory)
- **Does:** stack + ADRs, ARCHITECTURE, data model/RLS approach, contracts, one plan per milestone, gardening.
- **Default tools:** superpowers `writing-plans` · context7 · Supabase plugin skills (`supabase`, `supabase-postgres-best-practices`) · typescript-lsp.
- **Add-ons:** gstack `/plan-eng-review` · spec-kit if you prefer spec→plan→tasks artifacts · built-in `Plan`/`Explore` subagents for codebase research.

## Designer — `designer` (sonnet)
- **Does:** design system (MASTER.md + tokens), screen specs, prototypes, scored design review.
- **Default tools:** ui-ux-pro-max (`--design-system --persist`, `--page`) · frontend-design · playwright-cli screenshots.
- **Add-ons:** official Figma plugin/MCP (if designs live in Figma) · gstack `/design-consultation`, `/design-review` · switch the model to opus if visual quality is the product's differentiator.

## Backend developer — `backend-dev` (sonnet)
- **Does:** migrations, RLS, APIs/server logic, backend bugs — test-first.
- **Default tools:** superpowers `test-driven-development`, `systematic-debugging`, `verification-before-completion` · Supabase CLI + `supabase-local` MCP · Supabase skills · context7 · security-guidance (flags risky patterns while editing) · typescript-lsp.
- **Guards:** dev-gate (can't finish red), role-guard (no docs/product, design, QA, team files).

## Frontend developer — `frontend-dev` (sonnet)
- **Does:** UI per specs and tokens, state, API integration, UI bugs — test-first + visual self-check.
- **Default tools:** superpowers TDD · frontend-design · design MASTER.md · typescript-lsp · playwright-cli.
- **Add-ons:** Chrome DevTools MCP (performance, console, network) · shadcn MCP/registry if you use shadcn/ui.

## Manual QA — `qa-manual` (sonnet, project memory)
- **Does:** AC acceptance with evidence, exploratory charters, bug reports, re-verification, scored verdict.
- **Default tools:** playwright-cli (+ `playwright-cli install --skills`) · board.py `check`.
- **Add-ons:** gstack `/qa-only` (report-only browser QA) · Claude in Chrome for flows that need a real signed-in browser.

## QA Automation — `qa-automation` (sonnet, project memory)
- **Does:** test strategy/harness, contract review of plans, test plans, integration/RLS/e2e, CI, verdict.
- **Default tools:** Vitest + Testing Library · Playwright Test + Test Agents (`npx playwright init-agents --loop=claude` → planner/generator/healer) · `@axe-core/playwright` · quality-gate.sh.
- **Add-ons:** pr-review-toolkit (`pr-test-analyzer`) · built-in `/run-skill-generator` + `/verify` (records how to launch the app for native verification).

## Security — `security-auditor` (sonnet)
- **Does:** Strix pentest (localhost + source), RLS/authz/secrets/dependency checks, triage, verdict.
- **Default tools:** Strix CLI (+ `npx skills add usestrix/strix`) · security-guidance · built-in `/security-review`.
- **Add-ons:** gstack `/cso` · Semgrep plugin (rule-based SAST) · Strix CI workflow (`.github/workflows/strix.yml`).

## Model routing
Roles pin aliases (`opus`/`sonnet`). With OmniRoute, remap the aliases (`ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`) to route every role at once — see team/SETUP.md. Keep Claude models on the lead, architect and reviewers: the protocols (superpowers, hooks, reports) are tuned for them.
