import { expect, signInEn, signOutViaUi, test } from "./support";

test.describe("sign-out (S-001 AC6)", () => {
  test("after sign-out /profile, /settings and /onboarding redirect to /sign-in?next=…", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await expect(page).toHaveURL(/\/onboarding$/);
    await signOutViaUi(page);

    for (const path of ["/profile", "/settings", "/onboarding"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in\?/);
      const url = new URL(page.url());
      expect(url.pathname).toBe("/sign-in");
      expect(url.searchParams.get("next")).toBe(path);
    }
  });
});
