import { expect, signInEn, test } from "../auth/support";
import { expectNoSeriousA11yViolations } from "../helpers/a11y";
import { EXTRACTION_TIMEOUT, dropzone, fileInput, fixture, openUploadStep, resumeRows, storageObjectExists, storedObjectCount } from "./support";

const MAX_BYTES = 5 * 1024 * 1024;
/** backend ports/resume_store.py MAX_EXTRACTION_ATTEMPTS */
const MAX_EXTRACTION_ATTEMPTS = 3;

test.describe("resume upload failures (S-003 AC2, AC3)", () => {
  test("png and too-large files are rejected with the spec messages and nothing is stored", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await openUploadStep(page);

    await fileInput(page).setInputFiles(fixture("not-a-resume.png"));
    const alert = page.getByRole("alert").filter({ hasText: "We only accept PDF or DOCX files" });
    await expect(alert).toBeVisible();
    await expect(dropzone(page)).toBeVisible();

    // One byte over 5 MiB, built in memory so the repo carries no 5 MB blob.
    await fileInput(page).setInputFiles({ name: "too-large.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(MAX_BYTES + 1) });
    await expect(page.getByRole("alert").filter({ hasText: "This file is larger than 5 MB" })).toBeVisible();
    await expect(alert).toBeHidden();
    await expect(dropzone(page)).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    // The browser sent nothing: no row, no object.
    expect(await resumeRows(newUser.id)).toEqual([]);
    expect(await storedObjectCount(newUser.id)).toBe(0);
  });

  test("the upload endpoint itself refuses an oversized body with 413 resume.too_large (not only the browser check) and nothing is stored", async ({
    page,
    newUser,
  }) => {
    await signInEn(page, newUser);
    await expect(page).toHaveURL(/\/onboarding$/);

    // Straight at /api/resume with the session cookies, bypassing the client-side size check.
    const res = await page.request.post("/api/resume", {
      multipart: { file: { name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(MAX_BYTES + 200_000) } },
    });
    expect(res.status()).toBe(413);
    expect(await res.json()).toEqual({ code: "resume.too_large" });

    expect(await resumeRows(newUser.id)).toEqual([]);
    expect(await storedObjectCount(newUser.id)).toBe(0);
  });

  test("a PNG renamed to .pdf passes the client check, is rejected by the server with the same message, and nothing is stored", async ({
    page,
    newUser,
  }) => {
    await signInEn(page, newUser);
    await openUploadStep(page);

    await fileInput(page).setInputFiles(fixture("png-renamed.pdf"));
    await expect(page.getByRole("alert").filter({ hasText: "We only accept PDF or DOCX files" })).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await expect(dropzone(page)).toBeVisible();

    expect(await resumeRows(newUser.id)).toEqual([]);
    expect(await storedObjectCount(newUser.id)).toBe(0);
  });

  test('scanned PDF shows "We couldn\'t read this resume", Fill in manually opens the editor, and the file stays attached', async ({
    page,
    newUser,
  }) => {
    await signInEn(page, newUser);
    await openUploadStep(page);
    await fileInput(page).setInputFiles(fixture("scanned.pdf"));

    await expect(page.getByRole("heading", { name: "We couldn't read this resume" })).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await expect(page.getByText("scanned.pdf stays attached — you can try again or fill in by hand.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await page.getByRole("link", { name: "Fill in manually" }).click();
    await expect(page).toHaveURL(/\/onboarding\/profile$/);
    await expect(page.getByRole("heading", { name: "Profile", level: 1 })).toBeVisible();
    // Blank editor, but the file is still attached and can be retried from here.
    await expect(page.getByLabel(/^Full name/)).toHaveValue("");
    await expect(page.getByText("We couldn't read scanned.pdf.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Replace resume" })).toBeVisible();

    const rows = await resumeRows(newUser.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ file_name: "scanned.pdf", status: "failed", error_code: "unreadable", is_current: true });
    expect(await storageObjectExists(rows[0]!.storage_path)).toBe(true);
  });

  test("ai-fail PDF shows the same failure and Try again is offered and re-runs the extraction", async ({ page, newUser }) => {
    await signInEn(page, newUser);
    await openUploadStep(page);
    await fileInput(page).setInputFiles(fixture("ai-fail.pdf"));

    await expect(page.getByRole("heading", { name: "We couldn't read this resume" })).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await expect(page.getByText("ai-fail.pdf stays attached — you can try again or fill in by hand.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Fill in manually" })).toBeVisible();
    const tryAgain = page.getByRole("button", { name: "Try again" });
    await expect(tryAgain).toBeVisible();

    const [first] = await resumeRows(newUser.id);
    expect(first).toMatchObject({ file_name: "ai-fail.pdf", status: "failed", error_code: "ai_failed", is_current: true });
    expect(await storageObjectExists(first!.storage_path)).toBe(true);

    // The fake LLM fails this file every time, so a retry ends on the same panel, but it really ran again:
    // the row was touched (updated_at advanced) and went through reset_for_retry (attempts back to 0, T-026), then
    // one fresh claim by the worker. So attempts is NOT cumulative: it ends equal to the first run's, within the cap.
    await tryAgain.click();
    await expect(page.getByRole("heading", { name: "We couldn't read this resume" })).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
    await expect
      .poll(async () => Date.parse((await resumeRows(newUser.id))[0]!.updated_at), { timeout: EXTRACTION_TIMEOUT })
      .toBeGreaterThan(Date.parse(first!.updated_at));
    // Wait for the re-run to reach its terminal state (reset puts the row in `processing` first).
    await expect.poll(async () => (await resumeRows(newUser.id))[0]?.status, { timeout: EXTRACTION_TIMEOUT }).toBe("failed");
    const [after] = await resumeRows(newUser.id);
    expect(after!.attempts).toBe(first!.attempts);
    expect(after!.attempts).toBeLessThanOrEqual(MAX_EXTRACTION_ATTEMPTS);
    expect(Date.parse(after!.updated_at)).toBeGreaterThan(Date.parse(first!.updated_at));
    expect(after).toMatchObject({ id: first!.id, status: "failed", error_code: "ai_failed" });
  });
});
