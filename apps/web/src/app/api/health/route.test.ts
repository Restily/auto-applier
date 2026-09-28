// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiHealthResult } from "@/lib/health";
import { createHealthRouteHandler } from "@/lib/health-route";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/health", () => {
  it("returns 503 unavailable with no-store when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ status: "unavailable", api: null });
  });

  it("returns 200 operational with the API body", async () => {
    const body = {
      status: "ok",
      version: "0.1.0",
      checks: {
        database: { status: "ok", latency_ms: 3, detail: null },
        queue: { status: "ok", latency_ms: 1, detail: null },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "operational", api: body });
  });

  it("returns 503 degraded when the API reports 503", async () => {
    const body = {
      status: "degraded",
      version: "0.1.0",
      checks: {
        database: { status: "ok", latency_ms: 3, detail: null },
        queue: { status: "down", latency_ms: 200, detail: "connection refused" },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "degraded", api: body });
  });

  it("returns 503 unavailable when the API returns a plain-text 500 body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Internal Server Error", {
          status: 500,
          headers: { "content-type": "text/plain" },
        }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable", api: null });
  });

  it("returns 503 unavailable when the API returns a 404 with an unrelated JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Not Found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable", api: null });
  });

  it("never throws when the injected fetchHealth throws", async () => {
    const handler = createHealthRouteHandler(() => Promise.reject(new Error("boom")));

    const response = await handler();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable", api: null });
  });

  it("returns 503 unavailable instead of throwing when the fetched result maps to a malformed body", async () => {
    // Intentionally malformed (missing `checks`) to exercise the route's own
    // safeguard, bypassing fetchApiHealth's own runtime validation.
    const malformedResult = {
      kind: "response",
      httpStatus: 200,
      body: { status: "ok", version: "0.1.0" },
    } as unknown as ApiHealthResult;
    const handler = createHealthRouteHandler(() => Promise.resolve(malformedResult));

    const response = await handler();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable", api: null });
  });
});
