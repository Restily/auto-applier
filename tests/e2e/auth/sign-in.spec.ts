import { uniqueEmail } from "../../integration/helpers/supabase";
import { ledgerRows } from "../helpers/db";
import { expect, fillCredentials, signInEn, signOutViaUi, test } from "./support";

test.describe("sign-in (S-001 AC4, AC7)", () => {
  test("wrong password and unknown email show the same \"Invalid email or password\"", async ({ page, newUser }) => {
    await signInEn(page, { email: newUser.email, password: "Wrong-password-1" });
    const wrongPassword = page.getByRole("alert").filter({ hasText: "Invalid email or password" });
    await expect(wrongPassword).toBeVisible();
    const wrongPasswordText = await wrongPassword.innerText();
    await expect(page).toHaveURL(/\/sign-in/);

    await signInEn(page, { email: uniqueEmail(), password: "Wrong-password-1" });
    const unknownEmail = page.getByRole("alert").filter({ hasText: "Invalid email or password" });
    await expect(unknownEmail).toBeVisible();
    expect(await unknownEmail.innerText()).toBe(wrongPasswordText);
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("signing in again never adds credits", async ({ page, newUser }) => {
    for (let round = 0; round < 2; round += 1) {
      await signInEn(page, newUser);
      await expect(page).toHaveURL(/\/onboarding$/);
      await expect(page.getByRole("button", { name: "20 credits" })).toBeVisible();
      await signOutViaUi(page);
    }
    expect(await ledgerRows(newUser.id)).toEqual([{ delta: 20, reason: "signup_grant" }]);
  });

  test("next param returns to the protected page", async ({ page, newUser }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings/);
    await fillCredentials(page, newUser);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  });

  test("an off-origin next param is ignored", async ({ page, newUser }) => {
    await signInEn(page, newUser, "//evil.example.test/steal");
    await expect(page).toHaveURL(/\/onboarding$/);
    expect(new URL(page.url()).hostname).toBe("localhost");
  });
});
