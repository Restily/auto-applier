import { describe, expect, it } from "vitest";

import { API_URL, APP_URL } from "./helpers/env";

// Black-box integration: exercises the real, running API and web processes
// (`bash team/bin/app.sh start`) over HTTP — no mocking. Review Focus #2
// (docs/superpowers/plans/2026-09-27-M0-foundations.md): the body must never
// leak a DSN, password or service-role key.
const SECRET_MARKERS = ["postgres:postgres", "postgresql://", "sb_secret_", "service_role"];

describe("API GET /health", () => {
  it("returns 200 with database and queue ok", async () => {
    const response = await fetch(`${API_URL}/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.queue.status).toBe("ok");
    expect(typeof body.checks.database.latency_ms).toBe("number");
    expect(typeof body.checks.queue.latency_ms).toBe("number");
  });

  it("is not cacheable", async () => {
    const response = await fetch(`${API_URL}/health`);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("leaks no secrets", async () => {
    const response = await fetch(`${API_URL}/health`);
    const raw = await response.text();

    for (const marker of SECRET_MARKERS) {
      expect(raw).not.toContain(marker);
    }
  });
});

describe("web GET /api/health", () => {
  it("returns 200 operational with the API body", async () => {
    const response = await fetch(`${APP_URL}/api/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("operational");
    expect(body.api).not.toBeNull();
    expect(body.api.status).toBe("ok");
    expect(body.api.checks.database.status).toBe("ok");
    expect(body.api.checks.queue.status).toBe("ok");
  });
});
