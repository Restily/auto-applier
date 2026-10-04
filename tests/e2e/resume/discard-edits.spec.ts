import { expect, signInEn, test } from "../auth/support";
import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { EXTRACTED, EXTRACTION_TIMEOUT, fileInput, fixture, openUploadStep, saveButton, uploadAndWaitForEditor } from "./support";

import type { Page } from "@playwright/test";

const UNSAVED = "Edited but not saved";

/** A saved, complete profile from resume-text.pdf, then /profile with an unsaved headline edit. */
async function savedProfileWithUnsavedEdit(page: Page, user: Parameters<typeof signInEn>[1]): Promise<void> {
  await signInEn(page, user);
  await openUploadStep(page);
  await uploadAndWaitForEditor(page, "resume-text.pdf");
  await saveButton(page).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto("/profile");
  await expect(page.getByText("resume-text.pdf is attached.")).toBeVisible();
  await page.getByLabel("Headline", { exact: true }).fill(UNSAVED);
  await expect(page.getByText("Unsaved changes")).toBeVisible();
}

async function replaceWithV2(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Replace resume" }).click();
  await expect(page.getByRole("dialog", { name: "Replace resume" })).toBeVisible();
  await fileInput(page).setInputFiles(fixture("resume-v2.docx"));
}

test.describe("replacing a resume while the profile editor is dirty (M1 review round 1, DiscardEditsDialog)", () => {
  test("asks first; Keep my edits leaves the draft untouched and the new resume is offered again on the next visit", async ({ page, newUser }) => {
    await savedProfileWithUnsavedEdit(page, newUser);
    await replaceWithV2(page);

    const ask = page.getByRole("dialog", { name: "Replace your unsaved changes?" });
    await expect(ask).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await expect(ask.getByText("resume-v2.docx is ready, but your profile has changes you haven't saved.")).toBeVisible();
    // The safe choice has focus, the destructive one does not.
    await expect(ask.getByRole("button", { name: "Keep my edits" })).toBeFocused();
    // No review dialog behind it: nothing was applied before the decision.
    await expect(page.getByRole("dialog", { name: "Review changes from your new resume" })).toHaveCount(0);
    await expectNoSeriousA11yViolations(page);

    await ask.getByRole("button", { name: "Keep my edits" }).click();
    await expect(ask).toBeHidden();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(UNSAVED);
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    // Nothing is lost for good: after a reload the unsaved draft is gone but the new resume is offered again.
    await page.reload();
    const review = page.getByRole("dialog", { name: "Review changes from your new resume" });
    await expect(review).toBeVisible();
    await review.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(EXTRACTED.headline);
  });

  test("Use the new resume drops the unsaved edit and continues to Review changes", async ({ page, newUser }) => {
    await savedProfileWithUnsavedEdit(page, newUser);
    await replaceWithV2(page);

    const ask = page.getByRole("dialog", { name: "Replace your unsaved changes?" });
    await expect(ask).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await ask.getByRole("button", { name: "Use the new resume" }).click();

    const review = page.getByRole("dialog", { name: "Review changes from your new resume" });
    await expect(review).toBeVisible();
    await review.getByRole("button", { name: "Apply" }).click();
    await expect(review).toBeHidden();
    // Every field defaulted to Keep current, so the editor shows the saved profile, not the discarded edit.
    await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(EXTRACTED.headline);
  });

  test("RU: the dialog is localised", async ({ page, newUser }) => {
    await savedProfileWithUnsavedEdit(page, newUser);
    await page.getByRole("button", { name: /: EN$/ }).click();
    await page.getByRole("menuitemradio", { name: "Русский" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    // A language switch re-renders but must not drop the draft.
    await expect(page.getByLabel("Заголовок профиля", { exact: true })).toHaveValue(UNSAVED);

    await page.getByRole("button", { name: "Заменить резюме" }).click();
    await fileInput(page).setInputFiles(fixture("resume-v2.docx"));
    const ask = page.getByRole("dialog", { name: "Заменить несохранённые изменения?" });
    await expect(ask).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await expect(ask.getByRole("button", { name: "Оставить мои правки" })).toBeFocused();
    await expect(ask.getByRole("button", { name: "Применить новое резюме" })).toBeVisible();
  });
});
