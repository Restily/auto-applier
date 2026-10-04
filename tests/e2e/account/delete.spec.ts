import { anonClient } from "../../integration/helpers/supabase";
import { expect, fillCredentials, signInEn, test, userExists, userIdFor } from "../auth/support";
import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { ledgerRows } from "../helpers/db";
import { fillRequiredFields, openManualEditor, openUploadStep, profileRow, resumeRows, saveButton, storageObjectExists, storedObjectCount, uploadAndWaitForEditor } from "../resume/support";
import { confirmInput, deleteViaUi, openDeleteDialog, remainingRows } from "./support";

test.describe("account deletion (S-006 AC2, AC3)", () => {
  test("typing the email and confirming deletes the account, shows the deleted page, and sign-in with old credentials fails; no rows or files remain", async ({
    page,
    newUser,
  }) => {
    // Give the account everything deletion has to remove: a resume file, a profile, the sign-up ledger row.
    await signInEn(page, newUser);
    await openUploadStep(page);
    await uploadAndWaitForEditor(page, "resume-text.pdf");
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    const [resume] = await resumeRows(newUser.id);
    expect(resume).toBeDefined();
    expect(await storageObjectExists(resume!.storage_path)).toBe(true);
    expect(await remainingRows(newUser.id)).toEqual({ profiles: 1, candidate_profiles: 1, resumes: 1, credit_ledger: 1 });

    // The confirm button stays disabled until the typed email matches (hint shown while it does not).
    const dialog = await openDeleteDialog(page);
    await expectNoSeriousA11yViolations(page);
    const confirm = dialog.getByRole("button", { name: "Delete my account" });
    await expect(confirm).toBeDisabled();
    await confirmInput(dialog).fill("someone.else@example.test");
    await expect(dialog.getByText("Doesn't match your account email yet")).toBeVisible();
    await expect(confirm).toBeDisabled();
    await confirmInput(dialog).fill(newUser.email);
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(page).toHaveURL(/\/account-deleted$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Your account has been deleted" })).toBeVisible();
    await expect(page.getByText("All your data has been permanently removed.")).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    // Signed out: protected pages bounce to sign-in.
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/sign-in\?/);

    // The old credentials no longer work, via the API and via the UI.
    const apiAttempt = await anonClient().auth.signInWithPassword({ email: newUser.email, password: newUser.password });
    expect(apiAttempt.error).not.toBeNull();
    await page.goto("/sign-in");
    await fillCredentials(page, newUser);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /invalid email or password/i })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);

    // Nothing is left: auth user, every owned row, the stored file.
    expect(await userExists(newUser.email)).toBe(false);
    expect(await remainingRows(newUser.id)).toEqual({ profiles: 0, candidate_profiles: 0, resumes: 0, credit_ledger: 0 });
    expect(await profileRow(newUser.id)).toBeNull();
    expect(await storageObjectExists(resume!.storage_path)).toBe(false);
    expect(await storedObjectCount(newUser.id)).toBe(0);
  });

  test("Cancel and Escape leave the account intact", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await openManualEditor(page);
    await fillRequiredFields(page, { fullName: "Keep Me", email: newUser.email, title: "QA Engineer", skill: "Playwright", years: "3–5 years" });
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    // Cancel: the dialog closes, the typed text is discarded.
    let dialog = await openDeleteDialog(page);
    await confirmInput(dialog).fill(newUser.email);
    await expect(dialog.getByRole("button", { name: "Delete my account" })).toBeEnabled();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(page).toHaveURL(/\/settings$/);

    // Escape: same, and the reopened dialog starts empty with the confirm button disabled again.
    dialog = await openDeleteDialog(page).catch(async () => {
      await page.getByRole("button", { name: "Delete account" }).click();
      return page.getByRole("alertdialog");
    });
    await expect(confirmInput(dialog)).toHaveValue("");
    await confirmInput(dialog).fill(newUser.email);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole("button", { name: "Delete account" }).click();
    await expect(confirmInput(page.getByRole("alertdialog"))).toHaveValue("");
    await expect(page.getByRole("alertdialog").getByRole("button", { name: "Delete my account" })).toBeDisabled();
    await page.keyboard.press("Escape");

    // Still signed in, and nothing was deleted.
    await page.goto("/profile");
    await expect(page.getByLabel(/^Full name/)).toHaveValue("Keep Me");
    expect(await userExists(newUser.email)).toBe(true);
    expect(await remainingRows(newUser.id)).toEqual({ profiles: 1, candidate_profiles: 1, resumes: 0, credit_ledger: 1 });
  });

  test("the delete dialog and the deleted page link to the privacy section on what is kept", async ({ page, newUser, context }) => {
    await signInEn(page, newUser);
    await expect(page).toHaveURL(/\/onboarding$/);

    const dialog = await openDeleteDialog(page);
    await expect(dialog.getByText("We keep only a one-way hash of your email")).toBeVisible();
    const dialogLink = dialog.getByRole("link", { name: "Privacy policy" });
    await expect(dialogLink).toHaveAttribute("href", "/privacy#after-deletion");
    const popupPromise = context.waitForEvent("page");
    await dialogLink.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/\/privacy#after-deletion$/);
    await expect(popup.getByRole("heading", { name: "What we keep after you delete your account" })).toBeVisible();
    await popup.close();

    await confirmInput(dialog).fill(newUser.email);
    await dialog.getByRole("button", { name: "Delete my account" }).click();
    await expect(page).toHaveURL(/\/account-deleted$/, { timeout: 30_000 });

    const deletedLink = page.getByRole("link", { name: "Privacy policy" });
    await expect(deletedLink).toHaveAttribute("href", "/privacy#after-deletion");
    await deletedLink.click();
    await expect(page).toHaveURL(/\/privacy#after-deletion$/);
    await expect(page.getByRole("heading", { name: "What we keep after you delete your account" })).toBeVisible();
  });

  test("after deletion, signing up again with the same email creates an account with 0 credits and no welcome-credits toast", async ({
    page,
    freshCreds,
  }) => {
    // First life: sign up through the UI, get the bonus once.
    await page.goto("/sign-up");
    await fillCredentials(page, freshCreds);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByText("You've got 20 free credits")).toBeVisible();
    const firstId = await userIdFor(freshCreds);
    expect(await ledgerRows(firstId)).toEqual([{ delta: 20, reason: "signup_grant" }]);

    await deleteViaUi(page, freshCreds.email);
    expect(await userExists(freshCreds.email)).toBe(false);

    // Second life: the same address in capitals still counts as the same email (D5).
    await page.goto("/sign-up");
    await fillCredentials(page, { email: freshCreds.email.toUpperCase(), password: freshCreds.password });
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { name: "Let's get you set up" })).toBeVisible();
    const credits = page.getByRole("button", { name: "0 credits" });
    await expect(credits).toBeVisible();
    await expect(page.getByText("You've got 20 free credits")).toHaveCount(0);
    await credits.click();
    await expect(page.getByText("Autopilot is paused until you have credits.")).toBeVisible();

    const secondId = await userIdFor(freshCreds);
    expect(secondId).not.toBe(firstId);
    expect(await ledgerRows(secondId)).toEqual([]);
  });
});
