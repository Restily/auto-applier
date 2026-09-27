---
id: T-002
type: task
title: Design system and app shell
status: done
milestone: M0
owner: designer
priority: P0
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## What to do

…

## Definition of done

- [x] Given the PRD personas, When the design system is created, Then docs/design/design-system/<slug>/MASTER.md defines colors, typography, spacing, components and states meeting WCAG 2.2 AA contrast
- [x] Screen specs exist for the M1 screens (sign-up, sign-in, reset password, onboarding checklist, resume upload, profile editor, settings/language)
- [x] The app shell (navigation, layout, language switcher placement, empty/error/loading patterns) is specified for desktop and mobile widths

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 13:03 AC 1 ✔ (designer): docs/design/design-system/autoapplier/MASTER.md §2 (color tokens, computed WCAG 2.2 AA ratios incl. new §2.4 on tinted-fill text; caught & fixed --success-on-success-subtle failing at 4.49:1), §3 (type scale, spacing, radii, shadow, motion, breakpoints 375/768/1280 + grid), §5 (shadcn/ui component inventory w/ variants+states); docs/design/tokens.css (implementation reference); all ratios independently recomputed and verified against the WCAG relative-luminance formula
- 2026-09-27 13:03 AC 2 ✔ (designer): docs/design/screens/S-001.md (sign-up, sign-in, reset/forgot password, sign-out, onboarding checklist), S-002.md (Google sign-in), S-003.md (resume upload + profile editor), S-004.md (manual profile fill/edit), S-005.md (settings/language switch, global i18n behavior), S-006.md (data export, account deletion) — each with every state, EN+RU copy tables, validation messages, 375/768/1280 responsive behavior, and focus-order/accessibility sections; prototype docs/design/prototypes/S-001.html checked visually at 375px/1280px (docs/design/prototypes/S-001-375.png, S-001-1280.png)
- 2026-09-27 13:03 AC 3 ✔ (designer): docs/design/design-system/autoapplier/MASTER.md §8 (App shell): §8.1 IA table (Feed/Review queue/History/Searches/Connections/Credits & Plans/Settings/operator-only Back office), §8.2-8.3 focus+full shell layouts desktop 1280/tablet 768/mobile 375, §8.4 header (credit balance popover, EN/RU DropdownMenu switcher, account menu), §8.5 connection-status indicator, §8.6 shell accessibility; prototype docs/design/prototypes/app-shell.html verified at 375px/1280px (docs/design/prototypes/app-shell-375.png, app-shell-1280.png) — sidebar/nav collapse, header cluster, M1 data-driven nav (Profile+Settings only) confirmed
- 2026-09-27 13:03 todo → done (designer): design system + shell + M1 specs complete; audited previous session's artifacts, fixed a real WCAG gap (text-on-tinted-alert contrast) and stale prototype evidence
