import { expect, signInEn, test } from "./support";

// D4: GoTrue has google:false locally, so only the edge states are testable (S-002 AC2, AC3).
test.describe("google (S-002 edge states)", () => {
  test("Google button and divider are absent when not configured and email sign-in works", async ({ page, newUser }) => {
    for (const path of ["/sign-up", "/sign-in"]) {
      await page.goto(path);
      await expect(page.getByLabel(/^Email/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
      await expect(page.getByText("or continue with email")).toHaveCount(0);
    }
    await signInEn(page, newUser);
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("returning with error=access_denied lands on sign-in with the neutral cancelled message and creates no user", async ({
    page,
  }) => {
    await page.goto("/auth/callback?error=access_denied&error_description=The+user+denied+access");
    await expect(page).toHaveURL(/\/sign-in\?notice=oauth_cancelled/);
    await expect(page.getByRole("alert").filter({ hasText: "Sign-in with Google was cancelled." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in to AutoApplier" })).toBeVisible();

    // No session was created: a protected page still sends the visitor to sign-in.
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings/);
  });

  test("a failed Google round-trip shows the failure panel with a way back", async ({ page }) => {
    await page.goto("/auth/callback?error=server_error");
    await expect(page).toHaveURL(/\/sign-in\?notice=oauth_failed/);
    await expect(page.getByText("We couldn't sign you in with Google.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
  });

  test("the callback without a code or error falls back to the failure panel", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/sign-in\?notice=oauth_failed/);
    await expect(page.getByText("We couldn't sign you in with Google.")).toBeVisible();
  });
});
