import "server-only";

import createClient, { type Client } from "openapi-fetch";

import { getServerEnv } from "@/lib/env.server";

import type { paths } from "./schema.gen";

/**
 * Typed client for the Python API. Only this module (and generated code
 * beside it) may import `openapi-fetch` directly — see
 * eslint.config.mjs's `no-restricted-imports` boundary. Everything else
 * calls the Python API through `createApiClient()`.
 */
export type ApiClient = Client<paths>;

/** Default per-request timeout for calls to the Python API, in milliseconds. */
export const API_TIMEOUT_MS = 5000;

export function createApiClient(opts?: {
  accessToken?: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  /** Per-request timeout in ms, overridable for tests. Defaults to API_TIMEOUT_MS. */
  timeoutMs?: number;
}): ApiClient {
  const timeoutMs = opts?.timeoutMs ?? API_TIMEOUT_MS;
  const baseFetch = opts?.fetch ?? fetch;
  const timedFetch: typeof fetch = (input, init) =>
    baseFetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });

  return createClient<paths>({
    baseUrl: opts?.baseUrl ?? getServerEnv().API_URL,
    fetch: timedFetch,
    headers: opts?.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : undefined,
    cache: "no-store",
  });
}
