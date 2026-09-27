import { type ApiHealthResult, fetchApiHealth, type HealthResponse, toSystemHealthView } from "@/lib/health";
import type { SystemHealthView } from "@/lib/health";

/**
 * Next.js route files may only export route fields (GET, dynamic, ...), so
 * the injectable handler factory lives here instead of in
 * app/api/health/route.ts.
 */
export interface HealthRouteBody {
  status: SystemHealthView["overall"];
  api: HealthResponse | null;
}

export function createHealthRouteHandler(
  fetchHealth: () => Promise<ApiHealthResult> = () => fetchApiHealth(),
): () => Promise<Response> {
  return async function GET(): Promise<Response> {
    let result: ApiHealthResult;
    try {
      result = await fetchHealth();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unknown error";
      result = { kind: "error", message };
    }

    const view = toSystemHealthView(result, new Date());
    const body: HealthRouteBody = {
      status: view.overall,
      api: result.kind === "response" ? result.body : null,
    };

    return Response.json(body, {
      status: view.overall === "operational" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  };
}
