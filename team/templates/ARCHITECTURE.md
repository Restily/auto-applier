# Architecture

_Owner: Architect · {{DATE}} · Decisions: docs/architecture/adr/_

## Context
<Product summary, constraints, quality attributes that drive the design.>

## Stack
| Concern | Choice | Version | ADR |
|---|---|---|---|

## Modules and layering
<Modules, allowed dependency directions, how they are enforced (lint rules).>

## Data model
<Tables, relations, ownership columns, RLS approach per table.>

## Auth and authorization
## API style and error handling
## Configuration and environments
<Local only for the MVP: env vars, `.env.example`, Supabase local keys.>
## Testing approach
<Link to docs/qa/TEST-STRATEGY.md; what each level covers.>
## Directory layout
## Scripts contract
`dev`, `build`, `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` (mirrored in team/config.sh if non-standard).
