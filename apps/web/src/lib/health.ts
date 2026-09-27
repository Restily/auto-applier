import { type ApiClient, createApiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema.gen";

export type HealthResponse = components["schemas"]["HealthResponse"];

export type ApiHealthResult =
  | { kind: "response"; httpStatus: number; body: HealthResponse }
  | { kind: "error"; message: string };

export type CheckKey = "database" | "queue";

export interface HealthCheckView {
  key: CheckKey;
  label: string;
  state: "ok" | "down";
  detail: string | null;
  latencyMs: number | null;
}

export interface SystemHealthView {
  overall: "operational" | "degraded" | "unavailable";
  version: string | null;
  checks: HealthCheckView[];
  checkedAt: string;
}

// Literal labels until M1 wires a shared i18n source (TD-001).
const CHECK_LABELS: Record<CheckKey, string> = {
  database: "Database",
  queue: "Queue",
};

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
    return { kind: "response", httpStatus: response.status, body };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown error";
    return { kind: "error", message };
  }
}

function unavailableView(now: Date): SystemHealthView {
  return {
    overall: "unavailable",
    version: null,
    checks: (Object.keys(CHECK_LABELS) as CheckKey[]).map((key) => ({
      key,
      label: CHECK_LABELS[key],
      state: "down",
      detail: "API unreachable",
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
    checks: (Object.keys(CHECK_LABELS) as CheckKey[]).map((key) => {
      const check = body.checks[key];
      return {
        key,
        label: CHECK_LABELS[key],
        state: check.status,
        detail: check.detail,
        latencyMs: check.latency_ms,
      };
    }),
    checkedAt: now.toISOString(),
  };
}
