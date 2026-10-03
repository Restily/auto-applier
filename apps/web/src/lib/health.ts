import { z } from "zod";

import { type ApiClient, createApiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema.gen";

export type HealthResponse = components["schemas"]["HealthResponse"];

/**
 * Runtime shape check for the `/health` response body. openapi-fetch parses
 * a non-2xx body as JSON when possible, or hands back the raw text
 * otherwise (e.g. uvicorn's plain-text 500, or `{"detail":"Not Found"}`
 * from a wrong API_URL) — neither matches `HealthResponse`, so
 * `fetchApiHealth` must not trust the shape without checking it.
 */
const checkOutSchema = z.object({
  status: z.enum(["ok", "down"]),
  latency_ms: z.number(),
  detail: z.string().nullable(),
});

const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  checks: z.object({
    database: checkOutSchema,
    queue: checkOutSchema,
  }),
});

export type ApiHealthResult =
  | { kind: "response"; httpStatus: number; body: HealthResponse }
  | { kind: "error"; message: string };

export type CheckKey = "database" | "queue";

export interface HealthCheckView {
  key: CheckKey;
  state: "ok" | "down";
  /** Raw detail reported by the API; null when there is none. */
  detail: string | null;
  /** True when the API itself could not be reached (rendered as a localized message). */
  unreachable: boolean;
  latencyMs: number | null;
}

export interface SystemHealthView {
  overall: "operational" | "degraded" | "unavailable";
  version: string | null;
  checks: HealthCheckView[];
  checkedAt: string;
}

// Labels come from the `health` message namespace (pays TD-001); the view carries keys only.
const CHECK_KEYS: readonly CheckKey[] = ["database", "queue"];

/**
 * Calls GET /health and never throws. Without an explicit client it builds
 * one per call via `createApiClient()`, so openapi-fetch picks up
 * `globalThis.fetch` at call time rather than at module-load time.
 */
export async function fetchApiHealth(client?: ApiClient): Promise<ApiHealthResult> {
  const apiClient = client ?? createApiClient();

  try {
    const { data, error, response } = await apiClient.GET("/health");
    const body = data ?? error;
    if (body === undefined) {
      return { kind: "error", message: "Empty response from API" };
    }
    const parsed = healthResponseSchema.safeParse(body);
    if (!parsed.success) {
      return { kind: "error", message: `Unexpected /health response shape: ${parsed.error.message}` };
    }
    return { kind: "response", httpStatus: response.status, body: parsed.data };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown error";
    return { kind: "error", message };
  }
}

function unavailableView(now: Date): SystemHealthView {
  return {
    overall: "unavailable",
    version: null,
    checks: CHECK_KEYS.map((key) => ({
      key,
      state: "down",
      detail: null,
      unreachable: true,
      latencyMs: null,
    })),
    checkedAt: now.toISOString(),
  };
}

export function toSystemHealthView(result: ApiHealthResult, now: Date): SystemHealthView {
  if (result.kind === "error") {
    return unavailableView(now);
  }

  const { httpStatus, body } = result;
  const overall: SystemHealthView["overall"] =
    httpStatus === 200 && body.status === "ok" ? "operational" : "degraded";

  return {
    overall,
    version: body.version,
    checks: CHECK_KEYS.map((key) => {
      const check = body.checks[key];
      return {
        key,
          state: check.status,
        detail: check.detail,
        unreachable: false,
        latencyMs: check.latency_ms,
      };
    }),
    checkedAt: now.toISOString(),
  };
}
