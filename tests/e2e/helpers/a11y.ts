import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Serious or critical WCAG 2.0/2.1/2.2 A/AA violations fail. */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  const bad = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(bad, `axe violations on ${page.url()}`).toEqual([]);
}
