import { readFile } from "node:fs/promises";

import { adminClient, createTestUser, deleteTestUser } from "../../integration/helpers/supabase";
import { expect, signInEn, test } from "../auth/support";
import { profileRow } from "../resume/support";

async function seedProfile(userId: string, email: string, fullName: string): Promise<void> {
  const { error } = await adminClient()
    .from("candidate_profiles")
    .insert({ user_id: userId, full_name: fullName, contact_email: email, target_titles: ["QA Engineer"], skills: ["Playwright"], years_experience: "3_5" });
  if (error) throw new Error(`seed profile: ${error.message}`);
}

test.describe("data export (S-006 AC1)", () => {
  test("Download my data saves autoapplier-export-<date>.json containing profile, searches, applications and credit_ledger for this user only", async ({
    page,
    newUser,
  }) => {
    const other = await createTestUser();
    try {
      const myName = `Export Owner ${newUser.id.slice(0, 8)}`;
      const otherName = `Export Other ${other.id.slice(0, 8)}`;
      await seedProfile(newUser.id, newUser.email, myName);
      await seedProfile(other.id, other.email, otherName);
      expect(await profileRow(newUser.id)).toMatchObject({ full_name: myName });

      await signInEn(page, newUser, "/settings");
      await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download my data" }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/^autoapplier-export-\d{4}-\d{2}-\d{2}\.json$/);
      await expect(page.getByText("Your export is downloading")).toBeVisible();

      const path = await download.path();
      const raw = await readFile(path, "utf8");
      const data = JSON.parse(raw) as {
        account: { id: string; email: string };
        profile: { full_name: string; contact_email: string; skills: string[] };
        searches: unknown[];
        applications: unknown[];
        credit_ledger: Array<{ delta: number; reason: string }>;
      };

      expect(data.account).toMatchObject({ id: newUser.id, email: newUser.email });
      expect(data.profile).toMatchObject({ full_name: myName, contact_email: newUser.email, skills: ["Playwright"] });
      expect(data.searches).toEqual([]);
      expect(data.applications).toEqual([]);
      expect(data.credit_ledger).toEqual([expect.objectContaining({ delta: 20, reason: "signup_grant" })]);

      // This user only: nothing of the other account appears anywhere in the file.
      for (const secret of [other.id, other.email, otherName]) expect(raw).not.toContain(secret);
    } finally {
      await deleteTestUser(other.id);
    }
  });

  test("the export route refuses an anonymous request", async ({ request }) => {
    const res = await request.get("/api/account/export", { maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
