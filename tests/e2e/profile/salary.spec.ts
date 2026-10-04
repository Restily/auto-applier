import { adminClient } from "../../integration/helpers/supabase";
import { expect, signInEn, test } from "../auth/support";
import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { fillRequiredFields, openManualEditor, profileRow, saveButton } from "../resume/support";

const REQUIRED = { fullName: "Dana Petrova", email: "dana.petrova@example.test", title: "QA Engineer", skill: "Playwright", years: "3–5 years" };
/** One above the Postgres integer limit the salary columns use (apps/web INT4_MAX). */
const TOO_LARGE = "2147483648";

test.describe("salary upper bound (M1 review round 1, validation key maxValue)", () => {
  test("EN: a salary above the integer limit is blocked on Max and on Min with 'This number is too large' and nothing is saved", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await openManualEditor(page);
    await fillRequiredFields(page, REQUIRED);
    await page.getByLabel("Max", { exact: true }).fill(TOO_LARGE);
    await saveButton(page).click();

    const tooLarge = page.getByText("This number is too large", { exact: true });
    await expect(tooLarge).toBeVisible();
    await expect(page.getByLabel("Max", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Max", { exact: true })).toBeFocused();
    await expect(page.getByText("Saved", { exact: true })).toHaveCount(0);
    await expectNoSeriousA11yViolations(page);
    expect(await profileRow(newUser.id)).toBeNull();

    // Min has the same bound; fixing Max alone leaves the Min error in place.
    await page.getByLabel("Max", { exact: true }).fill("");
    await page.getByLabel("Min", { exact: true }).fill(TOO_LARGE);
    await saveButton(page).click();
    await expect(page.getByLabel("Min", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(tooLarge).toBeVisible();
    expect(await profileRow(newUser.id)).toBeNull();

    // The largest valid value saves.
    await page.getByLabel("Min", { exact: true }).fill("2147483647");
    await saveButton(page).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect(await profileRow(newUser.id)).toMatchObject({ salary_min: 2147483647, salary_max: null });
  });

  test("RU: the same bound reads 'Слишком большое число'", async ({ page, newUser }) => {
    // The account language is on the profile; signing in from an English browser lands in Russian.
    const { error } = await adminClient().from("profiles").update({ ui_locale: "ru" }).eq("id", newUser.id);
    expect(error).toBeNull();
    await signInEn(page, newUser);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");

    await page.goto("/profile");
    await page.getByLabel(/^Полное имя/).fill(REQUIRED.fullName);
    await page.getByLabel("Макс", { exact: true }).fill(TOO_LARGE);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Слишком большое число", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Макс", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Сохранено", { exact: false })).toHaveCount(0);
    expect(await profileRow(newUser.id)).toBeNull();
  });
});
