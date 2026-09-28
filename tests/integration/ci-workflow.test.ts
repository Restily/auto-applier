import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

// Parses .github/workflows/ci.yml and asserts on its structure so the
// CI contract (Task 12, T-004 · 3) stays enforced in code, not just by eyeballing
// the YAML.
const workflowPath = join(__dirname, "..", "..", ".github", "workflows", "ci.yml");
const workflow = parse(readFileSync(workflowPath, "utf-8"));

function stepNames(steps: Array<Record<string, unknown>>): string[] {
  return steps.map((step) => (step.uses as string) ?? (step.name as string) ?? "");
}

describe("CI workflow (.github/workflows/ci.yml)", () => {
  it("runs on push to any branch and on pull_request", () => {
    const on = workflow.on;
    expect(on).toBeDefined();
    expect(on.push.branches).toEqual(["**"]);
    expect(on).toHaveProperty("pull_request");
  });

  it("cancels in-progress runs per ref", () => {
    expect(workflow.concurrency).toBeDefined();
    expect(workflow.concurrency["cancel-in-progress"]).toBe(true);
    expect(typeof workflow.concurrency.group).toBe("string");
  });

  it("has exactly one job, quality, on ubuntu-latest with a 45 minute timeout", () => {
    const jobNames = Object.keys(workflow.jobs);
    expect(jobNames).toEqual(["quality"]);

    const job = workflow.jobs.quality;
    expect(job["runs-on"]).toBe("ubuntu-latest");
    expect(job["timeout-minutes"]).toBe(45);
  });

  it("sets up node 22, uv and the supabase CLI", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;

    const setupNode = steps.find((step) => step.uses === "actions/setup-node@v4");
    expect(setupNode).toBeDefined();
    expect((setupNode!.with as Record<string, unknown>).node_version ?? (setupNode!.with as Record<string, unknown>)["node-version"]).toBe(22);
    expect((setupNode!.with as Record<string, unknown>).cache).toBe("npm");

    const setupUv = steps.find((step) => step.uses === "astral-sh/setup-uv@v6");
    expect(setupUv).toBeDefined();

    const setupSupabase = steps.find((step) => step.uses === "supabase/setup-cli@v1");
    expect(setupSupabase).toBeDefined();
    expect((setupSupabase!.with as Record<string, unknown>).version).toBe("2.118.0");
  });

  it("pins the Supabase CLI to 2.118.0", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;
    const setupSupabase = steps.find((step) => step.uses === "supabase/setup-cli@v1");
    expect(setupSupabase).toBeDefined();

    const version = (setupSupabase!.with as Record<string, unknown>).version;
    expect(typeof version).toBe("string");
    expect(version).toBe("2.118.0");
  });

  it("runs the quality job with APP_ENV=ci and LLM_PROVIDER=fake", () => {
    const job = workflow.jobs.quality as Record<string, unknown>;
    const env = job.env as Record<string, unknown> | undefined;
    expect(env).toBeDefined();
    expect(env!.APP_ENV).toBe("ci");
    expect(env!.LLM_PROVIDER).toBe("fake");
  });

  it("checks out the repo before anything else", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;
    expect(steps[0].uses).toBe("actions/checkout@v4");
  });

  it("runs bash team/bin/quality-gate.sh full", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;
    const gateStep = steps.find((step) => typeof step.run === "string" && (step.run as string).includes("quality-gate.sh full"));
    expect(gateStep).toBeDefined();
  });

  it("installs the playwright chromium browser", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;
    const playwrightStep = steps.find(
      (step) => typeof step.run === "string" && (step.run as string).includes("playwright install --with-deps chromium"),
    );
    expect(playwrightStep).toBeDefined();
  });

  it("starts valkey before the gate", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;
    const valkeyIndex = steps.findIndex(
      (step) => typeof step.run === "string" && (step.run as string).includes("bash scripts/valkey.sh start"),
    );
    const gateIndex = steps.findIndex(
      (step) => typeof step.run === "string" && (step.run as string).includes("quality-gate.sh full"),
    );

    expect(valkeyIndex).toBeGreaterThanOrEqual(0);
    expect(gateIndex).toBeGreaterThanOrEqual(0);
    expect(valkeyIndex).toBeLessThan(gateIndex);
  });

  it("runs npm ci before the tool-specific installs", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;
    const npmCiIndex = steps.findIndex((step) => step.run === "npm ci");
    const uvSyncIndex = steps.findIndex(
      (step) => typeof step.run === "string" && (step.run as string).includes("uv sync --directory backend --locked"),
    );

    expect(npmCiIndex).toBeGreaterThanOrEqual(0);
    expect(uvSyncIndex).toBeGreaterThanOrEqual(0);
  });

  it("uploads logs, playwright report and test results on failure", () => {
    const steps: Array<Record<string, unknown>> = workflow.jobs.quality.steps;
    const uploadStep = steps.find((step) => step.uses === "actions/upload-artifact@v4");
    expect(uploadStep).toBeDefined();
    expect(uploadStep!.if).toBe("failure()");

    const paths = (uploadStep!.with as Record<string, unknown>).path as string;
    expect(paths).toContain(".team/state");
    expect(paths).toContain("playwright-report/");
    expect(paths).toContain("test-results/");
  });

  it("has no leftover project-detection conditional", () => {
    const raw = readFileSync(workflowPath, "utf-8");
    expect(raw).not.toContain("Detect project");
    expect(raw).not.toContain("steps.detect.outputs");
  });
});
