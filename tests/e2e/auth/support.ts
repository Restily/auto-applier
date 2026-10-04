import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";

import { adminClient, anonClient, deleteTestUser, uniqueEmail } from "../../integration/helpers/supabase";
import { expect, test as base } from "../fixtures/test";

export { expect };

export type Creds = { email: string; password: string };

type Fixtures = {
  /** Unique credentials for an account the UI is about to create. Removed afterwards if it exists. */
  freshCreds: Creds;
};

export const test = base.extend<Fixtures>({
  freshCreds: async ({}, use) => {
    const creds = { email: uniqueEmail(), password: `Pw-${randomUUID()}` };
    try {
      await use(creds);
    } finally {
      const { data } = await anonClient().auth.signInWithPassword(creds);
      if (data.user) await deleteTestUser(data.user.id);
    }
  },
});

/** True when an auth user with this email exists (admin API, scans every page). */
export async function userExists(email: string): Promise<boolean> {
  const admin = adminClient();
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    if (data.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) return true;
    if (data.users.length < 1000) return false;
  }
}

/** Id of the user behind known credentials, via a real password sign-in. */
export async function userIdFor(creds: Creds): Promise<string> {
  const { data, error } = await anonClient().auth.signInWithPassword(creds);
  if (error || !data.user) throw new Error(`userIdFor: ${error?.message ?? "no user"}`);
  return data.user.id;
}

/** English labels: EN is the default locale of a fresh browser context. */
export async function fillCredentials(page: Page, creds: Creds): Promise<void> {
  await page.getByLabel(/^Email/).fill(creds.email);
  await page.getByLabel(/^Password/).fill(creds.password);
}

export async function signOutViaUi(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
}

export async function signInEn(page: Page, creds: Creds, next?: string): Promise<void> {
  await page.goto(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  await fillCredentials(page, creds);
  await page.getByRole("button", { name: "Sign in" }).click();
}
