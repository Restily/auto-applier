import { expect, type Locator, type Page } from "@playwright/test";

import { adminClient } from "../../integration/helpers/supabase";
import { userExists } from "../auth/support";

/** Settings -> Danger zone -> Delete account. Returns the confirmation dialog. */
export async function openDeleteDialog(page: Page, opts: { navigate?: boolean } = {}): Promise<Locator> {
  if (opts.navigate !== false) await page.goto("/settings");
  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText("This can't be undone")).toBeVisible();
  return dialog;
}

export function confirmInput(dialog: Locator): Locator {
  return dialog.getByLabel(/^Type your email to confirm/);
}

/** Types the email, confirms, and waits for the signed-out "deleted" page. */
export async function deleteViaUi(page: Page, typedEmail: string): Promise<void> {
  const dialog = await openDeleteDialog(page);
  await confirmInput(dialog).fill(typedEmail);
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/account-deleted$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Your account has been deleted" })).toBeVisible();
}

/** Rows this user still has in every user-owned table we can see through the secret key. */
export async function remainingRows(userId: string): Promise<Record<string, number>> {
  const admin = adminClient();
  const out: Record<string, number> = {};
  for (const [table, column] of [
    ["profiles", "id"],
    ["candidate_profiles", "user_id"],
    ["resumes", "user_id"],
    ["credit_ledger", "user_id"],
  ] as const) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, userId);
    if (error) throw new Error(`${table}: ${error.message}`);
    out[table] = count ?? 0;
  }
  return out;
}

export { userExists };
