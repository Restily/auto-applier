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

export function createApiClient(opts?: {
  accessToken?: string;
  fetch?: typeof fetch;
  baseUrl?: string;
}): ApiClient {
  return createClient<paths>({
    baseUrl: opts?.baseUrl ?? getServerEnv().API_URL,
    fetch: opts?.fetch,
    headers: opts?.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : undefined,
    cache: "no-store",
  });
}
