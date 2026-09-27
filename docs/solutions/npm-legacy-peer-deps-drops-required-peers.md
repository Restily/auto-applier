# npm-legacy-peer-deps-drops-required-peers

_2026-09-27 · Tags: npm, ERESOLVE, peerDependencies, apps/web_

## Symptom
`npm install` fails with:
```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error Found: typescript@6.0.3
npm error Could not resolve dependency:
npm error peer typescript@"^5.x" from openapi-typescript@7.13.0
```
(Adding `openapi-typescript@^7` as a devDependency next to the repo's pinned
`typescript@~6.0.3`.) Reaching for `.npmrc` with `legacy-peer-deps=true`
"fixes" the ERESOLVE, but then unit tests and typecheck break instead:
`Cannot find package 'vite' imported from .../vitest/dist/chunks/...` and,
after adding `vite` explicitly, `Cannot find package '@testing-library/dom'
imported from .../jest-dom/dist/vitest.mjs`.

## Root cause
npm 7+ auto-installs a package's `peerDependencies` by default, which is how
`vite` (a peer of `@vitejs/plugin-react`) and `@testing-library/dom` (a peer
of `@testing-library/react`) were reaching `node_modules` even though
neither was a direct dependency anywhere in this repo. `legacy-peer-deps`
reverts to the old npm 6 behavior, which does **not** auto-install peers —
it only stops npm from erroring when a peer range doesn't match. That fixed
the one real conflict (openapi-typescript's stated peer range for
TypeScript, which is fine in practice — it only uses TS for optional
programmatic/ts-morph usage, not for the plain CLI codegen this repo runs)
but silently dropped the *other*, actually-required peers the tree happened
to be relying on npm to auto-install.

Root package.json's `overrides` field also does not help here: it only
changes which version of a nested dependency gets *resolved*, not the peer
*range check* npm runs before that; `openapi-typescript`'s own
`peerDependencies` entry still triggers ERESOLVE regardless of what
`overrides` says.

## Fix
No `.npmrc` change. Instead, in `apps/web/package.json`, add the two
packages that were only ever present as auto-installed peers as explicit
`devDependencies` at the same major version already in the tree:
`"vite": "^8"` and `"@testing-library/dom": "^10"`. With those pinned
directly, plain `npm install` (and `npm ci`, which CI uses) resolves the
whole tree cleanly — no ERESOLVE, no ignored peer conflicts, no ambient
`legacy-peer-deps` mode risking dropping some *other* peer nobody has
noticed yet. Verified with `npm ci` from the committed lockfile.
Commit: `feat(web): health page, readiness route and typed api client`.

## Prevention
When adding a package whose install triggers ERESOLVE, don't reach for
`legacy-peer-deps` (project- or user-wide) as the first move — it changes
peer-install behavior for the *entire* tree, not just the one conflicting
package, and the failure mode (a peer silently missing from
`node_modules`) only surfaces later, in a different command, with a
different, unrelated-looking error. Prefer: pin the true offender's
peer explicitly if it's already compatible in practice (as here), or use a
scoped `overrides` entry when the mismatch is a real, safe-to-force version
bump. Either way, always finish with `npm ci` (not just `npm install`) to
confirm the *committed* lockfile installs clean, since that's what CI runs.
