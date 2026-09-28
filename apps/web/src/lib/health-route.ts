import {
  type ApiHealthResult,
  fetchApiHealth,
  type HealthResponse,
  type SystemHealthView,
  toSystemHealthView,
} from "@/lib/health";

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
    let view: SystemHealthView;
    try {
      result = await fetchHealth();
      // Second safeguard: even if an injected fetchHealth hands back a
      // malformed "response" result (bypassing fetchApiHealth's own runtime
      // validation), the mapping below must not crash the route — see I1.
      view = toSystemHealthView(result, new Date());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unknown error";
      result = { kind: "error", message };
      view = toSystemHealthView(result, new Date());
    }

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
