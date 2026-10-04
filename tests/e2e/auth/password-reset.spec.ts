import { extractLink } from "../../integration/helpers/mailpit";
import { expect, fillCredentials, signInEn, test } from "./support";

import type { Page } from "@playwright/test";
import type { TestUser } from "../../integration/helpers/supabase";

type Mailpit = { waitForEmail: (to: string, opts?: { timeoutMs?: number; subjectIncludes?: string }) => Promise<{ html: string }> };

async function requestResetLink(page: Page, user: TestUser, mailpit: Mailpit): Promise<URL> {
  await page.goto("/sign-in/forgot-password");
  await page.getByLabel(/^Email/).fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const mail = await mailpit.waitForEmail(user.email);
  return extractLink(mail.html, "/auth/confirm");
}

test.describe("password reset (S-001 AC5)", () => {
  test("reset link sets a new password; old password fails; new works", async ({ page, newUser, mailpit }) => {
    const link = await requestResetLink(page, newUser, mailpit);
    const newPassword = "Brand-new-pass-42";

    await page.goto(link.href);
    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await page.getByLabel(/^Password/).fill(newPassword);
    await page.getByRole("button", { name: "Save new password" }).click();

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText("Password updated. Sign in with your new password.")).toBeVisible();

    await signInEn(page, { email: newUser.email, password: newUser.password });
    await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.getByLabel(/^Email/).fill(newUser.email);
    await page.getByLabel(/^Password/).fill(newPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("using the same link twice shows the expired panel", async ({ page, browser, newUser, mailpit }) => {
    const link = await requestResetLink(page, newUser, mailpit);

    await page.goto(link.href);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();

    // The token is single-use: a second browser opening the same link is rejected.
    const second = await browser.newContext(test.info().project.use as Parameters<typeof browser.newContext>[0]);
    try {
      const secondPage = await second.newPage();
      await secondPage.goto(link.href);
      await expect(secondPage).toHaveURL(/\/reset-password\?error=link_invalid/);
      await expect(secondPage.getByRole("heading", { name: "This link has expired" })).toBeVisible();
      await expect(secondPage.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
        "href",
        "/sign-in/forgot-password",
      );
      await expect(secondPage.getByLabel(/^Password/)).toHaveCount(0);
    } finally {
      await second.close();
    }
  });

  test("a tampered token_hash shows the expired panel", async ({ page, newUser, mailpit }) => {
    const link = await requestResetLink(page, newUser, mailpit);
    const original = link.searchParams.get("token_hash") ?? "";
    expect(original.length).toBeGreaterThan(8);
    link.searchParams.set("token_hash", `${original.startsWith("0") ? "1" : "0"}${original.slice(1)}`);

    await page.goto(link.href);
    await expect(page).toHaveURL(/\/reset-password\?error=link_invalid/);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    await expect(page.getByLabel(/^Password/)).toHaveCount(0);

    // And the old password is untouched.
    await fillCredentialsAndSignIn(page, newUser);
  });

  test("an ordinary password session cannot set a new password without the emailed link: submit lands on the expired panel and the old password still works", async ({
    page,
    browser,
    newUser,
  }) => {
    // Signed in with the password (amr = password), not through a recovery link.
    await signInEn(page, newUser);
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.goto("/reset-password");
    await page.getByLabel(/^Password/).fill("Sneaky-new-pass-42");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page).toHaveURL(/\/reset-password\?error=link_invalid/);
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();

    // Nothing changed: the old password signs in from a clean browser, the attempted one does not.
    const fresh = await browser.newContext(test.info().project.use as Parameters<typeof browser.newContext>[0]);
    try {
      const other = await fresh.newPage();
      await signInEn(other, { email: newUser.email, password: "Sneaky-new-pass-42" });
      await expect(other.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible();
      await fillCredentialsAndSignIn(other, newUser);
    } finally {
      await fresh.close();
    }
  });
});

async function fillCredentialsAndSignIn(page: Page, user: TestUser): Promise<void> {
  await page.goto("/sign-in");
  await fillCredentials(page, user);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}
