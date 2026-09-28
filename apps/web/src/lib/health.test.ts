// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { type ApiClient, createApiClient } from "@/lib/api/client";
import { fetchApiHealth, type HealthResponse, toSystemHealthView } from "@/lib/health";

const NOW = new Date("2026-09-27T12:00:00.000Z");

function okBody(): HealthResponse {
  return {
    status: "ok",
    version: "0.1.0",
    checks: {
      database: { status: "ok", latency_ms: 3, detail: null },
      queue: { status: "ok", latency_ms: 1, detail: null },
    },
  };
}

function degradedBody(): HealthResponse {
  return {
    status: "degraded",
    version: "0.1.0",
    checks: {
      database: { status: "ok", latency_ms: 3, detail: null },
      queue: { status: "down", latency_ms: 200, detail: "connection refused" },
    },
  };
}

describe("toSystemHealthView", () => {
  it("maps 200 ok to operational", () => {
    const view = toSystemHealthView({ kind: "response", httpStatus: 200, body: okBody() }, NOW);

    expect(view.overall).toBe("operational");
    expect(view.version).toBe("0.1.0");
    expect(view.checkedAt).toBe(NOW.toISOString());
  });

  it("maps 503 with queue down to degraded and keeps detail", () => {
    const view = toSystemHealthView({ kind: "response", httpStatus: 503, body: degradedBody() }, NOW);

    expect(view.overall).toBe("degraded");
    const queue = view.checks.find((check) => check.key === "queue");
    expect(queue?.state).toBe("down");
    expect(queue?.detail).toBe("connection refused");
  });

  it("maps a network error to unavailable with both checks down", () => {
    const view = toSystemHealthView({ kind: "error", message: "fetch failed" }, NOW);

    expect(view.overall).toBe("unavailable");
    expect(view.checks.every((check) => check.state === "down")).toBe(true);
    expect(view.checks.every((check) => check.detail === "API unreachable")).toBe(true);
  });

  it("treats 200 with body status degraded as degraded", () => {
    const view = toSystemHealthView({ kind: "response", httpStatus: 200, body: degradedBody() }, NOW);

    expect(view.overall).toBe("degraded");
  });
});

describe("fetchApiHealth", () => {
  it("returns kind error when fetch rejects", async () => {
    const client = {
      GET: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    } as unknown as ApiClient;

    const result = await fetchApiHealth(client);

    expect(result.kind).toBe("error");
  });

  it("returns kind response with body on 503", async () => {
    const body = degradedBody();
    const client = {
      GET: vi.fn().mockResolvedValue({
        data: undefined,
        error: body,
        response: new Response(null, { status: 503 }),
      }),
    } as unknown as ApiClient;

    const result = await fetchApiHealth(client);

    expect(result).toEqual({ kind: "response", httpStatus: 503, body });
  });

  it("returns kind error when the API returns a plain-text 500 body", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        data: undefined,
        error: "Internal Server Error",
        response: new Response(null, { status: 500 }),
      }),
    } as unknown as ApiClient;

    const result = await fetchApiHealth(client);

    expect(result.kind).toBe("error");
  });

  it("returns kind error when the API returns a 404 with an unrelated JSON body", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        data: undefined,
        error: { detail: "Not Found" },
        response: new Response(null, { status: 404 }),
      }),
    } as unknown as ApiClient;

    const result = await fetchApiHealth(client);

    expect(result.kind).toBe("error");
  });

  it("returns kind error when the response is empty", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        data: undefined,
        error: undefined,
        response: new Response(null, { status: 200 }),
      }),
    } as unknown as ApiClient;

    const result = await fetchApiHealth(client);

    expect(result.kind).toBe("error");
  });

  it("returns kind error when a 200 body is missing checks", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        data: { status: "ok", version: "0.1.0" },
        error: undefined,
        response: new Response(null, { status: 200 }),
      }),
    } as unknown as ApiClient;

    const result = await fetchApiHealth(client);

    expect(result.kind).toBe("error");
  });

  it("returns kind error when the API hangs past the request timeout", async () => {
    const hangingFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const client = createApiClient({
      fetch: hangingFetch,
      baseUrl: "http://127.0.0.1:8000",
      timeoutMs: 10,
    });

    const result = await fetchApiHealth(client);

    expect(result.kind).toBe("error");
  });
});
