import { expect, signInEn, test } from "../auth/support";
import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { EXTRACTED, EXTRACTION_TIMEOUT, chip, fileInput, fixture, openUploadStep, profileRow, resumeRows, saveButton, storageObjectExists, uploadAndWaitForEditor } from "./support";

test.describe("replace a resume on a saved profile (S-003 AC4)", () => {
  test("with a saved profile, uploading resume-v2.docx opens Review changes with Keep current defaults; Apply with one Use new changes only that field after Save; the previous file is gone", async ({
    page,
    newUser,
  }) => {
    // A saved, complete profile from the first resume.
    await signInEn(page, newUser);
    await openUploadStep(page);
    await uploadAndWaitForEditor(page, "resume-text.pdf");
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    const [original] = await resumeRows(newUser.id);
    expect(original).toMatchObject({ file_name: "resume-text.pdf", status: "ready" });
    const before = await profileRow(newUser.id);
    expect(before).toMatchObject({ target_titles: [EXTRACTED.title], headline: EXTRACTED.headline, years_experience: "6_10", is_complete: true });

    // Replace from the editor: the upload runs inside a dialog, the profile stays underneath.
    await page.goto("/profile");
    await expect(page.getByText("resume-text.pdf is attached.")).toBeVisible();
    await page.getByRole("button", { name: "Replace resume" }).click();
    const replace = page.getByRole("dialog", { name: "Replace resume" });
    await expect(replace).toBeVisible();
    await expectNoSeriousA11yViolations(page);
    await fileInput(page).setInputFiles(fixture("resume-v2.docx"));

    const review = page.getByRole("dialog", { name: "Review changes from your new resume" });
    await expect(review).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await expect(review.getByText("We found differences between your current profile and resume-v2.docx.")).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    // Only the fields that differ are listed, and every one defaults to Keep current.
    const changed = ["Target titles", "Headline", "Skills", "Years of experience"];
    for (const field of changed) {
      const group = review.getByRole("radiogroup", { name: field });
      await expect(group.getByRole("radio", { name: /^Keep current/ })).toBeChecked();
      await expect(group.getByRole("radio", { name: /^Use new/ })).not.toBeChecked();
    }
    await expect(review.getByRole("radiogroup", { name: "Full name" })).toHaveCount(0);
    await expect(review.getByRole("radiogroup", { name: "Contact email" })).toHaveCount(0);

    // Use new for one field only, then Apply.
    await review.getByRole("radiogroup", { name: "Target titles" }).getByRole("radio", { name: /^Use new/ }).check();
    await review.getByRole("button", { name: "Apply" }).click();
    await expect(review).toBeHidden();

    await expect(page.getByText("We filled this from resume-v2.docx — check it over.")).toBeVisible();
    await expect(chip(page, "Staff Engineer")).toBeVisible();
    await expect(chip(page, EXTRACTED.title)).toHaveCount(0);
    await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(EXTRACTED.headline);
    for (const skill of EXTRACTED.skills) await expect(chip(page, skill)).toBeVisible();
    await expect(chip(page, "Go")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /^Years of experience/ })).toHaveText(EXTRACTED.years);

    // Apply is a draft: nothing is written until Save.
    expect(await profileRow(newUser.id)).toMatchObject({ target_titles: [EXTRACTED.title] });
    await saveButton(page).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await expect.poll(async () => (await profileRow(newUser.id))?.target_titles).toEqual(["Staff Engineer"]);
    const after = await profileRow(newUser.id);
    expect(after).toMatchObject({
      headline: EXTRACTED.headline,
      skills: [...EXTRACTED.skills],
      years_experience: "6_10",
      full_name: EXTRACTED.fullName,
      is_complete: true,
    });

    // The previous file is gone: its row and its object; the new one is the only current resume.
    const rows = await resumeRows(newUser.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ file_name: "resume-v2.docx", status: "ready", is_current: true });
    expect(rows[0]!.id).not.toBe(original!.id);
    expect(after?.source_resume_id).toBe(rows[0]!.id);
    expect(await storageObjectExists(original!.storage_path)).toBe(false);
    expect(await storageObjectExists(rows[0]!.storage_path)).toBe(true);
  });
});
