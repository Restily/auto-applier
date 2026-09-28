import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/components/shell/test-utils";
import { HealthStatus } from "@/components/health/health-status";
import type { SystemHealthView } from "@/lib/health";

const CHECKED_AT = "2026-09-27T12:00:00.000Z";

function operationalView(): SystemHealthView {
  return {
    overall: "operational",
    version: "0.1.0",
    checks: [
      { key: "database", state: "ok", detail: null, unreachable: false, latencyMs: 3 },
      { key: "queue", state: "ok", detail: null, unreachable: false, latencyMs: 1 },
    ],
    checkedAt: CHECKED_AT,
  };
}

function degradedView(): SystemHealthView {
  return {
    overall: "degraded",
    version: "0.1.0",
    checks: [
      { key: "database", state: "ok", detail: null, unreachable: false, latencyMs: 3 },
      { key: "queue", state: "down", detail: "connection refused", unreachable: false, latencyMs: 200 },
    ],
    checkedAt: CHECKED_AT,
  };
}

function unavailableView(): SystemHealthView {
  return {
    overall: "unavailable",
    version: null,
    checks: [
      { key: "database", state: "down", detail: null, unreachable: true, latencyMs: null },
      { key: "queue", state: "down", detail: null, unreachable: true, latencyMs: null },
    ],
    checkedAt: CHECKED_AT,
  };
}

describe("HealthStatus", () => {
  it("renders heading and overall text", async () => {
    await renderWithIntl(<HealthStatus view={operationalView()} />);

    expect(screen.getByRole("heading", { level: 1, name: "System health" })).toBeInTheDocument();
    expect(screen.getByTestId("health-overall")).toHaveTextContent("Operational");
  });

  it("renders OK/Down as text for each check", async () => {
    await renderWithIntl(<HealthStatus view={degradedView()} />);

    expect(screen.getByTestId("health-check-database")).toHaveTextContent("OK");
    expect(screen.getByTestId("health-check-queue")).toHaveTextContent("Down");
  });

  it("shows detail for a down check", async () => {
    await renderWithIntl(<HealthStatus view={degradedView()} />);

    expect(screen.getByTestId("health-check-queue")).toHaveTextContent("connection refused");
  });

  it("renders Unavailable state without crashing", async () => {
    await renderWithIntl(<HealthStatus view={unavailableView()} />);

    expect(screen.getByTestId("health-overall")).toHaveTextContent("Unavailable");
    expect(screen.getByTestId("health-check-database")).toHaveTextContent("Down");
  });

  it("renders the unreachable detail from the message catalog", async () => {
    await renderWithIntl(<HealthStatus view={unavailableView()} />);

    expect(screen.getByTestId("health-check-database")).toHaveTextContent("API unreachable");
  });

  it("renders Russian labels", async () => {
    await renderWithIntl(<HealthStatus view={degradedView()} />, "ru");

    expect(screen.getByRole("heading", { level: 1, name: "Состояние системы" })).toBeInTheDocument();
    expect(screen.getByTestId("health-overall")).toHaveTextContent("Работает с перебоями");
    expect(screen.getByTestId("health-check-queue")).toHaveTextContent("Не работает");
  });
});
