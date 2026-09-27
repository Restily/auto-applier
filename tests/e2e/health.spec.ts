import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const REPO_ROOT = path.resolve(__dirname, "../..");

test.describe("health page", () => {
  test("shows database and queue OK", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/health");

    await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
    await expect(page.getByTestId("health-overall")).toHaveText("Operational");
    await expect(page.getByTestId("health-check-database")).toContainText("OK");
    await expect(page.getByTestId("health-check-queue")).toContainText("OK");

    expect(consoleErrors).toEqual([]);
  });

  test("design tokens are applied", async ({ page }) => {
    const tokensCss = fs.readFileSync(path.join(REPO_ROOT, "docs/design/tokens.css"), "utf-8");
    const withoutComments = tokensCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const match = withoutComments.match(/--([a-zA-Z0-9-]+):\s*([^;]+);/);
    if (!match) {
      throw new Error("No custom property declaration found in docs/design/tokens.css");
    }
    const name = `--${match[1]}`;

    await page.goto("/health");

    const value = await page.evaluate(
      (tokenName) => getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim(),
      name,
    );

    expect(value).not.toBe("");
  });

  test("no horizontal scroll", async ({ page }) => {
    await page.goto("/health");

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );

    expect(overflows).toBe(false);
  });
});
