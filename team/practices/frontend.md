# Frontend best practices — what / how / where

Confirm APIs/versions with **context7**. Stack: TypeScript, Next.js App Router, React, Tailwind + shadcn/ui, Supabase client. Build only from the screen spec (`docs/design/screens/<S-id>.md`) and the design system (`docs/design/design-system/<slug>/MASTER.md` + `tokens.css`). ADRs win over these defaults.

## Components & state (where: `src/app/`, `src/components/`)
- Server Components by default; add `"use client"` only for interactivity (state, effects, event handlers). Keep data fetching on the server; pass plain props down.
- Colocate state with its use; lift only when shared. Prefer URL/searchParams and server state over global stores; reach for a store only for genuinely cross-cutting client state.
- Derive, don't duplicate: compute from source state in render instead of syncing copies in effects. `useEffect` is for synchronizing with external systems, not for deriving values.
- Stable keys (never array index for dynamic lists); memoize only a measured hot path.

## Every screen ships all states
Loading (skeleton, not layout shift), empty, error (with retry), success, disabled/pending. Copy comes from the spec, not invented. Optimistic UI only when you can roll back on failure.

## Styling (where: Tailwind + tokens)
- Use design tokens/variables from `tokens.css` — never ad-hoc hex, px, or one-off spacing. Reuse shadcn/ui primitives and their variants; don't fork a new visual language (use the `frontend-design` skill for craft).
- Responsive at 375 / 768 / 1280; test the small width first. No fixed heights that clip content.

## Accessibility (WCAG 2.2 AA — required, not optional)
- Semantic elements first (`button`, `a`, `nav`, `label`); role/aria only to fill gaps. Every input has a associated label; icons-only buttons have `aria-label`.
- Full keyboard path with visible focus; logical tab order; `Esc`/focus-trap for dialogs; announce async results (`aria-live`). Contrast ≥ 4.5:1; touch targets ≥ 44px.
- Prefer role/label-based markup so tests use `getByRole`/`getByLabel`; add `data-testid` only when qa-automation asks.

## Data & performance
- Use the generated Supabase types and the server/client helpers from ARCHITECTURE; rely on RLS, never the service-role key in the browser. Validate/handle the error branch of every request.
- Guard against layout shift (size media, reserve space); lazy-load below-the-fold and heavy client components; keep client bundles small (import per-symbol, avoid moment-style libs). Next `<Image>` for images.

## Testing (TDD)
- Unit-test hooks/reducers/formatters/validation and component behavior with Testing Library (query by role/label, assert behavior not markup). Visual self-check before hand-in: `app.sh start` + playwright-cli screenshots at 375 and 1280 vs the spec.
