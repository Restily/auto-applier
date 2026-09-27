---
name: design-handoff
description: "Designer method — design system with ui-ux-pro-max, screen specs, HTML prototypes and scored design reviews of the running UI with playwright-cli. Preloaded into designer."
user-invocable: false
---

# Design handoff

## Design system (M0; extend later)
1. Invoke the `ui-ux-pro-max` skill. If `docs/design/design-system/<slug>/MASTER.md` exists, read it and extend — never regenerate with `--force` without the lead's decision. Otherwise generate and persist: query "<product type> <industry> <keywords>" with `--design-system --persist -p "<Product>" --output-dir docs/design` (follow the skill's own instructions for the script path).
2. Use the `frontend-design` skill for a distinctive aesthetic direction (avoid generic AI look).
3. Complete MASTER.md so frontend-dev can implement without guessing: color tokens with contrast ratios (WCAG AA), type scale, spacing scale, radii, shadows, motion, breakpoints (375/768/1280), layout grid, component inventory mapped to the UI kit (e.g. shadcn/ui names) with variants and states, iconography, voice & tone, empty/error/loading patterns.
4. Also write `docs/design/tokens.css` (CSS variables) as the implementation reference; frontend-dev wires it into the app.

## Screen specs (every UI story)
`board.py scaffold screen <S-id>` and fill: purpose and entry points · layout (ASCII wireframe or prototype link) · components (UI kit names) · every state (loading, empty, error, success, disabled) · exact copy (buttons, labels, errors, empty states) · validation messages · responsive behavior · accessibility (focus order, labels, announcements) · interactions/motion. Page-specific deviations from MASTER → ui-ux-pro-max `--page <name>`.
Optional prototype: self-contained `docs/design/prototypes/<S-id>.html` using the tokens; check it with playwright-cli screenshots at 375 and 1280.

## Design review (verifying of UI milestones; MR for the whole product)
1. `bash team/bin/app.sh url`; with playwright-cli capture every screen of the milestone in all states you can reach, at 375px and 1280px → `docs/design/reviews/<M>/`.
2. Compare with specs and MASTER: spacing, alignment, typography, color/tokens, states, copy, responsiveness, focus visibility, contrast.
3. Defects → `board.py new bug "<screen>: <deviation>" --owner frontend-dev --severity <medium|low; high if unusable> --milestone <M> --by designer --body-file -` with expected (spec) vs actual (screenshot).
4. `board.py scaffold design-review <M>` scorecard (1–5, be strict):
   - **Design quality** — coherent, intentional visual hierarchy (threshold ≥ 3)
   - **Fidelity** — matches specs and tokens (threshold ≥ 4)
   - **Craft** — spacing, alignment, typography details, all states (threshold ≥ 3)
   - **Usability & a11y** — clarity, focus, contrast, touch targets (threshold ≥ 3)
   `Verdict: PASS` only if all thresholds are met and no high visual bug is open; otherwise `Verdict: FAIL` with reasons.
