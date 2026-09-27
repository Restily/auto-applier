---
name: mvp-kickoff
description: "Start a new product with the human — idea → approved spec (superpowers:brainstorming) → PRD, roadmap, board and autonomy grant. Use when the user brings a product/MVP idea or asks to start a project."
argument-hint: "<product idea in one sentence>"
---

# Kickoff: $ARGUMENTS

You are the Team Lead. This is the only phase that requires the human; after it the team runs autonomously. Keep the human's time focused on decisions only they can make.

## 0. Prepare
- `git rev-parse --is-inside-work-tree || git init -b main`; `python3 team/bin/board.py init`.
- If `docs/product/PRD.md` exists: ask whether to extend it or start over. Never overwrite silently.

## 1. Product spec with the human
Invoke `superpowers:brainstorming` for the idea (architectural path). Cover, one question at a time, offering options with a recommendation:
target users and their job-to-be-done · the problem and current alternatives · 3–7 core user journeys · MVP scope (must / should / won't) · constraints (stack preferences, integrations, languages, compliance, budget) · success metrics · non-goals · top risks.
Keep technical detail out of the spec — it constrains the product, not the implementation (the architect decides per milestone).
Result: an approved spec in `docs/superpowers/specs/`. Constitution override: **do not** invoke writing-plans afterwards.

## 2. PRD
`board.py scaffold prd` and fill it: vision, personas, problems, user stories `S-001…` each with testable acceptance criteria (Given/When/Then, include negative and edge cases), non-functional requirements (performance budget, WCAG 2.2 AA, security, i18n), out of scope, metrics, assumptions, open questions.

## 3. Roadmap
`board.py scaffold roadmap` and fill it:
- **M0 Foundations** — stack + ADRs, app skeleton, local Supabase, design system, test harness + CI, health page. No user stories.
- **M1…Mn** — vertical slices, each demoable end-to-end, 3–6 stories, ordered by value and dependencies (P0 first). Typical MVP: 3–5 feature milestones.
- **MR Release** — hardening: security, accessibility, performance, full regression, product README.

## 4. Board
- Milestones: `board.py new milestone "Foundations" --id M0`, `… --id M1 --ui` (use `--ui` for every milestone with user-facing screens), …, `board.py new milestone "Release" --id MR --release --ui`.
- M0 tasks (each with `--ac`): architecture & ADRs (`--owner architect`), design system (`--owner designer`), app skeleton + Supabase (`--owner backend-dev`), test harness & strategy (`--owner qa-automation`).
- Stories: `board.py new story "<title>" --milestone M1 --owner <frontend-dev|backend-dev> --priority P0 --ac "Given… When… Then…" --ac "…"`. Owner = the developer responsible for integrating the story end-to-end.
- `board.py validate` must be OK.

## 5. Project notes
Fill "Product" in CLAUDE.md (3–5 lines) and set the artifact language if the human prefers another.

## 6. Autonomy grant (human decision)
`board.py scaffold autonomy`. Show the human the grants, limits and budget; adjust to their answers. Set `approved: yes`, `approved_by`, `date` **only after explicit consent in chat**.

## 7. Close kickoff
`git add -A && git commit -m "docs: kickoff — spec, PRD, roadmap, board"`. Summarize for the human (scope, milestones, first demo) and offer the next step: `/mvp-autopilot` (autonomous) or `/mvp-milestone M0` (step by step).
