import { expect, signInEn, test } from "../auth/support";
import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { EXTRACTED, chip, EXTRACTION_TIMEOUT, dropzone, fileInput, fixture, openUploadStep, profileRow, resumeRows, saveButton } from "./support";

test.describe("resume upload and extraction (S-003 AC1)", () => {
  for (const [label, file] of [
    ["PDF", "resume-text.pdf"],
    ["DOCX", "resume.docx"],
  ] as const) {
    test(`${label} resume becomes an editable draft within 60 s with name, contacts, titles, skills, experience, education, languages, location and links`, async ({
      page,
      newUser,
    }) => {
      await signInEn(page, newUser);
      await openUploadStep(page);
      await expectNoSeriousA11yViolations(page);

      await expect(dropzone(page)).toBeVisible();
      await fileInput(page).setInputFiles(fixture(file));

      // Draft appears: banner names the file, and nothing is written to the profile until Save.
      await expect(page.getByText(`We filled this from ${file} — check it over.`)).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
      await expect(page).toHaveURL(/\/onboarding\/profile$/);
      expect(await profileRow(newUser.id)).toBeNull();

      await expect(page.getByLabel(/^Full name/)).toHaveValue(EXTRACTED.fullName);
      await expect(page.getByLabel(/^Contact email/)).toHaveValue(EXTRACTED.email);
      await expect(page.getByLabel("Phone", { exact: true })).toHaveValue(EXTRACTED.phone);
      await expect(page.getByLabel("Location", { exact: true })).toHaveValue(EXTRACTED.location);
      await expect(page.getByLabel("Headline", { exact: true })).toHaveValue(EXTRACTED.headline);
      // Links: the fixture has none, so both fields exist and are empty rather than invented.
      await expect(page.getByLabel("LinkedIn", { exact: true })).toHaveValue("");
      await expect(page.getByLabel("Portfolio", { exact: true })).toHaveValue("");
      await expect(chip(page, EXTRACTED.title)).toBeVisible();
      for (const skill of EXTRACTED.skills) await expect(chip(page, skill)).toBeVisible();
      await expect(page.getByRole("combobox", { name: /^Years of experience/ })).toHaveText(EXTRACTED.years);
      await expect(page.getByText(EXTRACTED.experience, { exact: true })).toBeVisible();
      await expect(page.getByText(EXTRACTED.education, { exact: true })).toBeVisible();
      for (const language of EXTRACTED.languages) await expect(page.getByText(language, { exact: true })).toBeVisible();
      await expectNoSeriousA11yViolations(page);

      // The draft is editable and saves: the profile is complete and the resume stays attached.
      await page.getByLabel("Headline", { exact: true }).fill("Staff backend engineer");
      await saveButton(page).click();
      await expect(page).toHaveURL(/\/onboarding$/);
      await expect(page.getByText("Done", { exact: true })).toBeVisible();

      const row = await profileRow(newUser.id);
      expect(row).toMatchObject({
        full_name: EXTRACTED.fullName,
        contact_email: EXTRACTED.email,
        headline: "Staff backend engineer",
        target_titles: [EXTRACTED.title],
        skills: [...EXTRACTED.skills],
        years_experience: "6_10",
        is_complete: true,
      });
      const resumes = await resumeRows(newUser.id);
      expect(resumes).toHaveLength(1);
      expect(resumes[0]).toMatchObject({ file_name: file, status: "ready", is_current: true });
      expect(row?.source_resume_id).toBe(resumes[0]?.id);
    });
  }
});
