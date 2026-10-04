import { anonClient } from "../../integration/helpers/supabase";
import { ledgerRows } from "../helpers/db";
import { expect, fillCredentials, test, userExists, userIdFor } from "./support";

test.describe("sign-up (S-001 AC1-AC3)", () => {
  test("valid sign-up lands on the checklist with 20 credits and the welcome toast", async ({ page, freshCreds }) => {
    await page.goto("/sign-up");
    await fillCredentials(page, freshCreds);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Let's get you set up" })).toBeVisible();
    await expect(page.getByText("You've got 20 free credits")).toBeVisible();
    await expect(page.getByRole("button", { name: "20 credits" })).toBeVisible();

    const rows = await ledgerRows(await userIdFor(freshCreds));
    expect(rows).toEqual([{ delta: 20, reason: "signup_grant" }]);
  });

  test("duplicate email shows neutral message with Sign in and Reset password and creates no user", async ({
    page,
    newUser,
  }) => {
    const attemptedPassword = "Another-pass-1";
    await page.goto("/sign-up");
    await fillCredentials(page, { email: newUser.email, password: attemptedPassword });
    await page.getByRole("button", { name: "Sign up" }).click();

    const alert = page.getByRole("alert").filter({ hasText: "An account with this email already exists." });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    await expect(alert.getByRole("link", { name: "Reset password" })).toHaveAttribute("href", "/sign-in/forgot-password");
    await expect(page).toHaveURL(/\/sign-up$/);

    // No second account and no overwrite: the original password still works, the attempted one does not.
    const overwrite = await anonClient().auth.signInWithPassword({ email: newUser.email, password: attemptedPassword });
    expect(overwrite.error).not.toBeNull();
    const original = await anonClient().auth.signInWithPassword({ email: newUser.email, password: newUser.password });
    expect(original.error).toBeNull();
    expect(await ledgerRows(newUser.id)).toHaveLength(1);
  });

  test("malformed email and 7-char password show field errors and create no user", async ({ page, freshCreds }) => {
    await page.goto("/sign-up");
    await page.getByLabel(/^Email/).fill("not-an-email");
    await page.getByLabel(/^Password/).fill("1234567");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByLabel(/^Email/)).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/sign-up$/);

    // Valid email, 7-char password: only the password is rejected.
    await page.getByLabel(/^Email/).fill(freshCreds.email);
    await page.getByLabel(/^Password/).fill("1234567");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("At least 8 characters", { exact: true }).and(page.getByRole("alert"))).toBeVisible();
    await expect(page.getByLabel(/^Password/)).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/sign-up$/);

    expect(await userExists(freshCreds.email)).toBe(false);
  });
});
