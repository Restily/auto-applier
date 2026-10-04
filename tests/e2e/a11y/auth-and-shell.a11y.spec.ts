import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { expect, signInEn, test } from "../auth/support";

import type { Page } from "@playwright/test";

const PUBLIC_PAGES: Array<[string, string]> = [
  ["sign-up", "/sign-up"],
  ["sign-in", "/sign-in"],
  ["forgot password", "/sign-in/forgot-password"],
  ["reset password (expired link)", "/reset-password?error=link_invalid"],
  ["privacy", "/privacy"],
];
const SIGNED_IN_PAGES: Array<[string, string]> = [
  ["onboarding", "/onboarding"],
  ["settings", "/settings"],
];

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

test.describe("axe: auth and shell", () => {
  for (const [name, url] of PUBLIC_PAGES) {
    test(`${name} has no serious or critical violations`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      await expectNoSeriousA11yViolations(page);
    });
  }

  for (const [name, url] of SIGNED_IN_PAGES) {
    test(`${name} has no serious or critical violations`, async ({ page, newUser }) => {
      await signInEn(page, newUser);
      await expect(page).toHaveURL(/\/onboarding$/);
      await page.goto(url);
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      await expectNoSeriousA11yViolations(page);
    });
  }

  test("sign-in with a field error and the duplicate-email alert have no serious violations", async ({ page, newUser }) => {
    await page.goto("/sign-up");
    await page.getByLabel(/^Email/).fill(newUser.email);
    await page.getByLabel(/^Password/).fill("Another-pass-1");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "already exists" })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe("no horizontal scroll at 360 px", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const [name, url] of PUBLIC_PAGES) {
    test(`${name} fits the viewport`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }

  for (const [name, url] of SIGNED_IN_PAGES) {
    test(`${name} fits the viewport`, async ({ page, newUser }) => {
      await signInEn(page, newUser);
      await expect(page).toHaveURL(/\/onboarding$/);
      await page.goto(url);
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }
});

test.describe("touch targets (T-008)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "rendered touch-target contract applies to the mobile project only");
  });

  async function expectTargets(page: Page, url: string): Promise<void> {
    await page.goto(url);
    await expect(page.locator("main h1, main h2").first()).toBeVisible();
    const buttons = page.locator('button[data-size="default"], button[data-size="icon"]');
    await expect(buttons.first(), `${url} renders default/icon buttons`).toBeVisible();

    const small: string[] = [];
    let measured = 0;
    for (const button of await buttons.all()) {
      if (!(await button.isVisible())) continue;
      const box = await button.boundingBox();
      const size = await button.getAttribute("data-size");
      const label = (await button.getAttribute("aria-label")) ?? (await button.innerText()).trim();
      expect(box, `${label} has a box`).not.toBeNull();
      measured += 1;
      if (box!.height < 44 || (size === "icon" && box!.width < 44)) {
        small.push(`${size} "${label}" ${Math.round(box!.width)}x${Math.round(box!.height)}`);
      }
    }
    expect(measured, `${url} measured buttons`).toBeGreaterThan(0);
    expect(small, `${url} buttons under 44px`).toEqual([]);
  }

  test("primary actions are at least 44×44 on /sign-up", async ({ page }) => {
    await expectTargets(page, "/sign-up");
  });

  test("primary actions are at least 44×44 on /sign-in", async ({ page }) => {
    await expectTargets(page, "/sign-in");
  });

  test("primary actions are at least 44×44 on /onboarding", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expectTargets(page, "/onboarding");
  });
});
