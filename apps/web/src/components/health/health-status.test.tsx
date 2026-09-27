import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthStatus } from "@/components/health/health-status";
import type { SystemHealthView } from "@/lib/health";

const CHECKED_AT = "2026-09-27T12:00:00.000Z";

function operationalView(): SystemHealthView {
  return {
    overall: "operational",
    version: "0.1.0",
    checks: [
      { key: "database", label: "Database", state: "ok", detail: null, latencyMs: 3 },
      { key: "queue", label: "Queue", state: "ok", detail: null, latencyMs: 1 },
    ],
    checkedAt: CHECKED_AT,
  };
}

function degradedView(): SystemHealthView {
  return {
    overall: "degraded",
    version: "0.1.0",
    checks: [
      { key: "database", label: "Database", state: "ok", detail: null, latencyMs: 3 },
      { key: "queue", label: "Queue", state: "down", detail: "connection refused", latencyMs: 200 },
    ],
    checkedAt: CHECKED_AT,
  };
}

function unavailableView(): SystemHealthView {
  return {
    overall: "unavailable",
    version: null,
    checks: [
      { key: "database", label: "Database", state: "down", detail: "API unreachable", latencyMs: null },
      { key: "queue", label: "Queue", state: "down", detail: "API unreachable", latencyMs: null },
    ],
    checkedAt: CHECKED_AT,
  };
}

describe("HealthStatus", () => {
  it("renders heading and overall text", () => {
    render(<HealthStatus view={operationalView()} />);

    expect(screen.getByRole("heading", { level: 1, name: "System health" })).toBeInTheDocument();
    expect(screen.getByTestId("health-overall")).toHaveTextContent("Operational");
  });

  it("renders OK/Down as text for each check", () => {
    render(<HealthStatus view={degradedView()} />);

    expect(screen.getByTestId("health-check-database")).toHaveTextContent("OK");
    expect(screen.getByTestId("health-check-queue")).toHaveTextContent("Down");
  });

  it("shows detail for a down check", () => {
    render(<HealthStatus view={degradedView()} />);

    expect(screen.getByTestId("health-check-queue")).toHaveTextContent("connection refused");
  });

  it("renders Unavailable state without crashing", () => {
    render(<HealthStatus view={unavailableView()} />);

    expect(screen.getByTestId("health-overall")).toHaveTextContent("Unavailable");
    expect(screen.getByTestId("health-check-database")).toHaveTextContent("Down");
  });
});
