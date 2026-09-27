# Project: AutoApplier

This product is built by an AI team. Team rules (roles, pipeline, models, prohibitions):

@team/CONSTITUTION.md

## Product
<!-- Filled by the lead at /mvp-kickoff: 3–5 lines — what, for whom, core value. Details: docs/product/PRD.md -->
- AutoApplier: a web platform that finds vacancies on LinkedIn (Jobs + hiring posts), Telegram job channels and job aggregators (incl. Hirify/HireHi) and sends AI-personalized applications from the user's own email, Telegram account and LinkedIn Easy Apply (via a Chrome extension).
- Users: international + CIS job seekers (tech first). UI in EN + RU; cover letters in the vacancy's language.
- Monetization: 20 free credits (1 credit = 1 sent application), then subscriptions via Stripe, USDT and Telegram Stars.
- Stack (human decisions): Python backend/parsers, Celery + Redis (Valkey locally) for background jobs, Next.js web with a component library, Supabase, pluggable LLM (Claude default).
- All third-party integrations are built and tested against fakes/fixtures; the team never uses real accounts or real money.
- Spec: docs/superpowers/specs/2026-09-27-auto-applier-design.md · PRD: docs/product/PRD.md · Roadmap: docs/product/ROADMAP.md
- Artifact language: English

## Project commands
<!-- Filled by the architect in M0: dev, tests, build, migrations, type generation. Same commands go to team/config.sh -->

## Lessons learned
<!-- The lead appends short general rules after milestone retros. Rules only, not a diary. -->
