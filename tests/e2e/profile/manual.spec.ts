import { expect, signInEn, test } from "../auth/support";
import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { addChip, fillRequiredFields, openManualEditor, pickOption, profileRow, saveButton } from "../resume/support";

const REQUIRED = { fullName: "Dana Petrova", email: "dana.petrova@example.test", title: "QA Engineer", skill: "Playwright", years: "3–5 years" };

test.describe("manual profile (S-004)", () => {
  test("filling the five required fields saves and the checklist shows Done", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await expect(page.getByText("0 of 1 steps complete")).toBeVisible();
    await expect(page.getByText("Upload a resume or fill it in — takes about 2 minutes.")).toBeVisible();

    await openManualEditor(page);
    // Required fields show their markers from the first render, and the editor is accessible.
    await expect(page.getByLabel(/^Full name/)).toHaveAttribute("aria-required", "true");
    await expect(page.getByRole("combobox", { name: /^Years of experience/ })).toHaveAttribute("aria-required", "true");
    await expectNoSeriousA11yViolations(page);

    await fillRequiredFields(page, REQUIRED);
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await saveButton(page).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByText("1 of 1 steps complete")).toBeVisible();
    await expect(page.getByText("Done", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You're all set." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();

    expect(await profileRow(newUser.id)).toMatchObject({
      full_name: REQUIRED.fullName,
      contact_email: REQUIRED.email,
      target_titles: [REQUIRED.title],
      skills: [REQUIRED.skill],
      years_experience: "3_5",
      is_complete: true,
    });
  });

  test("saving with an invalid email and URL is blocked and highlights them; fixing them and saving with missing fields highlights those and the profile stays incomplete", async ({
    page,
    newUser,
  }) => {
    await signInEn(page, newUser);
    await openManualEditor(page);

    // Format errors block the write, all at once, and focus goes to the first one.
    await page.getByLabel(/^Full name/).fill(REQUIRED.fullName);
    const email = page.getByLabel(/^Contact email/);
    await email.fill("not-an-email");
    const linkedin = page.getByLabel("LinkedIn", { exact: true });
    await linkedin.fill("nope");
    await saveButton(page).click();

    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email address" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Enter a valid URL" })).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(linkedin).toHaveAttribute("aria-invalid", "true");
    await expect(email).toBeFocused();
    await expect(page.getByText("Saved", { exact: false })).toHaveCount(0);
    expect(await profileRow(newUser.id)).toBeNull();
    await expectNoSeriousA11yViolations(page);

    // Format fixed, required fields still missing: the write happens, the gaps are highlighted, the profile is incomplete.
    await email.fill(REQUIRED.email);
    await linkedin.fill("");
    await saveButton(page).click();

    await expect(page.getByText("Saved. Fill in the highlighted fields to complete your profile.")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Add at least one target title" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Add at least one skill" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "This field is required" })).toHaveCount(1); // years of experience
    await expect(page.getByRole("combobox", { name: /^Target titles/ })).toBeFocused();
    await expect(page).toHaveURL(/\/onboarding\/profile$/);
    expect(await profileRow(newUser.id)).toMatchObject({ full_name: REQUIRED.fullName, contact_email: REQUIRED.email, is_complete: false });

    await page.goto("/onboarding");
    await expect(page.getByText("0 of 1 steps complete")).toBeVisible();
    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
  });

  test("an emptied required text field is highlighted as required and still saves as incomplete", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await openManualEditor(page);

    // Contact email starts as the sign-up email; clearing it and leaving the name empty are both "required".
    await page.getByLabel(/^Contact email/).fill("");
    await addChip(page, "Skills", "Playwright");
    await saveButton(page).click();

    await expect(page.getByText("Saved. Fill in the highlighted fields to complete your profile.")).toBeVisible();
    await expect(page.getByLabel(/^Full name/)).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel(/^Contact email/)).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel(/^Full name/)).toBeFocused();
    expect(await profileRow(newUser.id)).toMatchObject({ skills: ["Playwright"], is_complete: false });
  });

  test("application answers and phone persist after reload", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await openManualEditor(page);
    await fillRequiredFields(page, REQUIRED);
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    // Edit the saved profile from the app shell.
    await page.goto("/profile");
    await expect(page.getByLabel(/^Full name/)).toHaveValue(REQUIRED.fullName);
    await page.getByLabel("Phone", { exact: true }).fill("+49 30 1234567");
    await pickOption(page, "Work authorization", "Would need visa sponsorship");
    await pickOption(page, "Relocation readiness", "Open to relocation");
    await pickOption(page, "Notice period", "1 month");
    await page.getByLabel("Min", { exact: true }).fill("4000");
    await page.getByLabel("Max", { exact: true }).fill("6000");
    await pickOption(page, "Currency", "EUR");
    await pickOption(page, "Period", "/month");
    await saveButton(page).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(/^Full name/)).toHaveValue(REQUIRED.fullName);
    await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("+49 30 1234567");
    await expect(page.getByRole("combobox", { name: "Work authorization" })).toHaveText("Would need visa sponsorship");
    await expect(page.getByRole("combobox", { name: "Relocation readiness" })).toHaveText("Open to relocation");
    await expect(page.getByRole("combobox", { name: "Notice period" })).toHaveText("1 month");
    await expect(page.getByLabel("Min", { exact: true })).toHaveValue("4000");
    await expect(page.getByLabel("Max", { exact: true })).toHaveValue("6000");
    await expect(page.getByRole("combobox", { name: "Currency" })).toHaveText("EUR");
    await expect(page.getByRole("combobox", { name: "Period" })).toHaveText("/month");

    expect(await profileRow(newUser.id)).toMatchObject({
      phone: "+49 30 1234567",
      work_authorization: "sponsorship",
      relocation: "open",
      notice_period: "1_month",
      salary_min: 4000,
      salary_max: 6000,
      salary_currency: "EUR",
      salary_period: "month",
      is_complete: true,
    });
  });

  test("checklist lists exactly the missing fields", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await openManualEditor(page);

    // Name only (contact email defaults to the sign-up email): three fields are missing, in the fixed order.
    await page.getByLabel(/^Full name/).fill(REQUIRED.fullName);
    await saveButton(page).click();
    await expect(page.getByText("Saved. Fill in the highlighted fields to complete your profile.")).toBeVisible();
    await page.goto("/onboarding");
    await expect(page.getByText("Missing: at least one target title, at least one skill, years of experience", { exact: true })).toBeVisible();

    // Add a title and a skill: only the years remain.
    await page.goto("/profile");
    await addChip(page, "Target titles", REQUIRED.title);
    await addChip(page, "Skills", REQUIRED.skill);
    await saveButton(page).click();
    await expect(page.getByText("Saved. Fill in the highlighted fields to complete your profile.")).toBeVisible();
    await page.goto("/onboarding");
    await expect(page.getByText("Missing: years of experience", { exact: true })).toBeVisible();
    await expect(page.getByText("0 of 1 steps complete")).toBeVisible();

    // Complete it: the list disappears and the step is Done.
    await page.goto("/profile");
    await pickOption(page, /^Years of experience/, REQUIRED.years);
    await saveButton(page).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.goto("/onboarding");
    await expect(page.getByText(/^Missing:/)).toHaveCount(0);
    await expect(page.getByText("Done", { exact: true })).toBeVisible();
  });
});
