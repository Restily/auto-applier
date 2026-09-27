// Test-only stand-in for the `server-only` package (aliased in vitest.config.mts).
// The real package throws when imported outside a React Server Component; Vitest
// runs in Node/jsdom, so importing it for real would break every unit test that
// touches a server-only module. This file intentionally does nothing.
export {};
