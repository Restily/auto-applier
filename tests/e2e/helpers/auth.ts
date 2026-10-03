import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";

// Selectors are semantic (role/label) and locale-tolerant (en|ru); screens land in later waves.
export async function signUpViaUi(
  page: Page,
  opts: { email?: string; password?: string } = {},
): Promise<{ email: string; password: string }> {
  const email = opts.email ?? `qa+${randomUUID()}@example.test`;
  const password = opts.password ?? `Pw-${randomUUID()}`;
  await page.goto("/sign-up");
  await page.getByLabel(/email|почта/i).fill(email);
  await page.getByLabel(/^(password|пароль)/i).first().fill(password);
  await page.getByRole("button", { name: /sign up|create account|регистр|создать/i }).click();
  return { email, password };
}

export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel(/email|почта/i).fill(email);
  await page.getByLabel(/^(password|пароль)/i).first().fill(password);
  await page.getByRole("button", { name: /sign in|log in|войти/i }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
}
