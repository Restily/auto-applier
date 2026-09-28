# Architect best practices — what / how / where

Your leverage is in decisions and contracts, not code. Verify every version/config with **context7** before committing to it.

## Choosing the stack (where: `docs/architecture/ARCHITECTURE.md`, `adr/`)
- Honor the PRD's constraints first; otherwise the team default (TS, Next.js App Router, Tailwind + shadcn/ui, Supabase, Vitest, Playwright). Prefer boring, well-documented, widely-supported tech over novelty — the team must maintain it autonomously.
- One decision per ADR: context → options (with trade-offs) → decision → consequences. Record deliberate shortcuts in `TECH-DEBT.md` with a pay-by milestone.
- Fewer moving parts beats cleverness. Don't add a queue, cache, microservice, or new datastore an MVP doesn't need.

## Layering & boundaries
- Define layers (e.g. ui → application/services → domain → data) and one allowed dependency direction; cross-cutting concerns enter through one explicit interface, not scattered imports.
- Make boundaries **mechanically enforced**, not just documented: an import/dependency lint rule (eslint import rules or dependency-cruiser) whose error message tells the agent how to fix the violation. Agents follow gates far more reliably than prose.

## Data & contracts (this is what unblocks parallel work)
- Design the data model and RLS approach up front (ownership columns, tenant isolation, closed sets as enums/checks). The schema is the contract every other task depends on — put migrations/types tasks first with no deps.
- API contracts = types + signatures + error shapes, decided before consumers. Frontend and backend tasks then depend on the contract, not on each other.

## Planning for parallel waves (`superpowers:writing-plans`)
- One plan per milestone, contracts + failing tests, not implementation code (detailed pseudo-implementations cascade errors downstream).
- Give **every** build task an accurate `files` set and `depends_on` so `board.py wave` can batch independent tasks and serialize dependents. Split work so file sets are disjoint (by feature/route/module) — overlapping files force serialization and kill the parallelism.
- End with a traceability table: AC → task → test → verification command.

## Gardening (milestone end)
- 10-minute drift check: code vs ARCHITECTURE/ADRs. Update docs, add `TECH-DEBT.md` entries, and file `T-` tasks for violations to pay down next milestone.
