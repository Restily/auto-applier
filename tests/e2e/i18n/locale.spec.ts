import { adminClient } from "../../integration/helpers/supabase";
import { expect, signInEn, test } from "../auth/support";

import type { Page } from "@playwright/test";

async function switchLanguage(page: Page, current: "EN" | "RU", target: "English" | "Русский"): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`: ${current}$`) }).click();
  await page.getByRole("menuitemradio", { name: target }).click();
}

test.describe("locale negotiation (S-005 AC1)", () => {
  test.describe("ru-RU browser", () => {
    test.use({ locale: "ru-RU" });

    test("Accept-Language ru-RU renders Russian sign-up", async ({ page }) => {
      await page.goto("/sign-up");
      await expect(page.locator("html")).toHaveAttribute("lang", "ru");
      await expect(page.getByRole("heading", { name: "Создайте аккаунт" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Зарегистрироваться" })).toBeVisible();
    });
  });

  test.describe("de-DE browser", () => {
    test.use({ locale: "de-DE" });

    test("de-DE renders English", async ({ page }) => {
      await page.goto("/sign-up");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    });
  });
});

test.describe("switching language (S-005 AC2)", () => {
  test("switching to RU re-renders the page, validation messages are Russian, and the choice survives reload and a new browser context after sign-in", async ({
    page,
    browser,
    newUser,
  }) => {
    // Anonymous switch on the sign-up page re-renders it and validation errors come out in Russian.
    await page.goto("/sign-up");
    await switchLanguage(page, "EN", "Русский");
    await expect(page.getByRole("heading", { name: "Создайте аккаунт" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await page.getByLabel(/^Email/).fill("not-an-email");
    await page.getByLabel(/^Пароль/).fill("1234567");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Введите корректный email" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Минимум 8 символов" })).toBeVisible();

    // The choice survives a reload.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Создайте аккаунт" })).toBeVisible();

    // Signed in, switch to RU from the shell; it is stored on the account.
    const english = await browser.newContext(test.info().project.use as Parameters<typeof browser.newContext>[0]);
    try {
      const first = await english.newPage();
      await signInEn(first, newUser);
      await expect(first).toHaveURL(/\/onboarding$/);
      await switchLanguage(first, "EN", "Русский");
      await expect(first.getByRole("heading", { name: "Первые шаги" })).toBeVisible();
      await expect(first.locator("html")).toHaveAttribute("lang", "ru");
    } finally {
      await english.close();
    }

    // A brand-new browser context (no cookies, English browser) signing in lands in Russian: it is on the account.
    const fresh = await browser.newContext(test.info().project.use as Parameters<typeof browser.newContext>[0]);
    try {
      const second = await fresh.newPage();
      await second.goto("/sign-in");
      await expect(second.locator("html")).toHaveAttribute("lang", "en");
      await second.getByLabel(/^Email/).fill(newUser.email);
      await second.getByLabel(/^Password/).fill(newUser.password);
      await second.getByRole("button", { name: "Sign in" }).click();
      await expect(second).toHaveURL(/\/onboarding$/);
      await expect(second.locator("html")).toHaveAttribute("lang", "ru");
      await expect(second.getByRole("heading", { name: "Первые шаги" })).toBeVisible();
    } finally {
      await fresh.close();
    }
  });

  test("reset email arrives in Russian after switching", async ({ page, mailpit, newUser }) => {
    await page.goto("/sign-in/forgot-password");
    await switchLanguage(page, "EN", "Русский");
    await expect(page.getByRole("heading", { name: "Восстановление пароля" })).toBeVisible();
    await page.getByLabel(/^Email/).fill(newUser.email);
    await page.getByRole("button", { name: "Отправить инструкции" }).click();
    await expect(page.getByRole("heading", { name: "Проверьте почту" })).toBeVisible();

    const mail = await mailpit.waitForEmail(newUser.email);
    expect(mail.html).toContain("Сменить пароль");
    expect(mail.html).not.toContain("Use the button below");
  });
});

test.describe("reset email language", () => {
  test.use({ locale: "ru-RU" });

  test("an account created from a Russian browser gets the Russian reset email", async ({
    page,
    mailpit,
    freshCreds,
  }) => {
    await page.goto("/sign-up");
    await page.getByLabel(/^Email/).fill(freshCreds.email);
    await page.getByLabel(/^Пароль/).fill(freshCreds.password);
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByRole("button", { name: "Меню аккаунта" }).click();
    await page.getByRole("menuitem", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/sign-in/forgot-password");
    await page.getByLabel(/^Email/).fill(freshCreds.email);
    await page.getByRole("button", { name: "Отправить инструкции" }).click();
    await expect(page.getByRole("heading", { name: "Проверьте почту" })).toBeVisible();

    const mail = await mailpit.waitForEmail(freshCreds.email);
    expect(mail.html).toContain("Сменить пароль");
    expect(mail.html).not.toContain("Use the button below");
  });
});

test.describe("language precedence", () => {
  test("a language chosen before sign-in is not lost when the account has another one", async ({ page, newUser }) => {
    // The account is English. The visitor picks Russian on the sign-in page, then signs in.
    const { error } = await adminClient().from("profiles").update({ ui_locale: "en" }).eq("id", newUser.id);
    expect(error).toBeNull();

    await page.goto("/sign-in");
    await switchLanguage(page, "EN", "Русский");
    await expect(page.getByRole("heading", { name: "Войдите в AutoApplier" })).toBeVisible();
    await page.getByLabel(/^Email/).fill(newUser.email);
    await page.getByLabel(/^Пароль/).fill(newUser.password);
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    // S-005 AC2: the user's choice (RU) persists; the app must not flip back to English.
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  });
});
