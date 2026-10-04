import path from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

import { adminClient } from "../../integration/helpers/supabase";

export const RESUME_FIXTURES = path.resolve(__dirname, "../../fixtures/resumes");
export const fixture = (name: string): string => path.join(RESUME_FIXTURES, name);

/** What the fake LLM extracts from every fixture except resume-v2.docx (see backend adapters/llm/fixtures). */
export const EXTRACTED = {
  fullName: "Alex Ivanov",
  email: "alex.ivanov@example.test",
  phone: "+1 555 0100",
  location: "Berlin, Germany",
  headline: "Senior backend engineer",
  title: "Senior Backend Engineer",
  skills: ["Python", "PostgreSQL", "Docker", "Kubernetes", "FastAPI", "Redis", "Celery"],
  years: "6–10 years",
  experience: "Senior Backend Engineer · Acme GmbH · 2019-03–Present",
  education: "BSc · TU Berlin · 2014",
  languages: ["English — Fluent", "German — Advanced", "Russian — Native"],
} as const;

export const EXTRACTION_TIMEOUT = 60_000;

/** The hidden `input[type=file]` behind the dropzone button. */
export function fileInput(page: Page): Locator {
  return page.locator('input[type="file"]');
}

export function dropzone(page: Page): Locator {
  return page.getByRole("button", { name: "Upload your resume, PDF or DOCX, up to 5 megabytes" });
}

/** Onboarding checklist -> "Get started" -> the upload step. Call right after `signInEn`: waits for the redirect to /onboarding. */
export async function openUploadStep(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/onboarding\/resume$/);
  await expect(page.getByRole("heading", { name: "Upload your resume" })).toBeVisible();
}

/** Uploads through the hidden input and waits for the editor to open (extraction runs on the Celery worker). */
export async function uploadAndWaitForEditor(page: Page, file: string): Promise<void> {
  await fileInput(page).setInputFiles(fixture(file));
  await expect(page.getByRole("heading", { name: "Profile", level: 1 })).toBeVisible({ timeout: EXTRACTION_TIMEOUT });
}

export type ResumeRow = { id: string; file_name: string; status: string; error_code: string | null; is_current: boolean; storage_path: string; attempts: number; updated_at: string };

export async function resumeRows(userId: string): Promise<ResumeRow[]> {
  const { data, error } = await adminClient()
    .from("resumes")
    .select("id, file_name, status, error_code, is_current, storage_path, attempts, updated_at")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error(`resumeRows: ${error.message}`);
  return (data ?? []) as ResumeRow[];
}

/** True when the private `resumes` bucket still holds this object. */
export async function storageObjectExists(storagePath: string): Promise<boolean> {
  const slash = storagePath.lastIndexOf("/");
  const folder = storagePath.slice(0, slash);
  const name = storagePath.slice(slash + 1);
  const { data, error } = await adminClient().storage.from("resumes").list(folder, { search: name });
  if (error) throw new Error(`storage list: ${error.message}`);
  return (data ?? []).some((o) => o.name === name);
}

export async function storedObjectCount(userId: string): Promise<number> {
  const { data, error } = await adminClient().storage.from("resumes").list(userId);
  if (error) throw new Error(`storage list: ${error.message}`);
  return (data ?? []).length;
}

export type ProfileRow = Record<string, unknown> & {
  full_name: string | null;
  contact_email: string | null;
  headline: string | null;
  target_titles: string[];
  skills: string[];
  years_experience: string | null;
  is_complete: boolean;
  phone: string | null;
  work_authorization: string | null;
  relocation: string | null;
  notice_period: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  source_resume_id: string | null;
};

export async function profileRow(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await adminClient().from("candidate_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`profileRow: ${error.message}`);
  return (data as ProfileRow | null) ?? null;
}

/** The remove button of a chip (exact: entry rows also have "Remove <summary>" buttons). */
export function chip(page: Page, value: string): Locator {
  return page.getByRole("button", { name: `Remove ${value}`, exact: true });
}

/** Adds a chip to a creatable chips field (Target titles / Skills). */
export async function addChip(page: Page, label: string, value: string): Promise<void> {
  const box = page.getByRole("combobox", { name: new RegExp(`^${label}`) });
  await box.fill(value);
  await box.press("Enter");
  await expect(chip(page, value)).toBeVisible();
}

export async function pickOption(page: Page, label: string | RegExp, option: string): Promise<void> {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Fills the five required fields on the profile editor. */
export async function fillRequiredFields(
  page: Page,
  v: { fullName: string; email: string; title: string; skill: string; years: string },
): Promise<void> {
  await page.getByLabel(/^Full name/).fill(v.fullName);
  await page.getByLabel(/^Contact email/).fill(v.email);
  await addChip(page, "Target titles", v.title);
  await addChip(page, "Skills", v.skill);
  await pickOption(page, /^Years of experience/, v.years);
}

export function saveButton(page: Page): Locator {
  return page.getByRole("button", { name: "Save changes" });
}

/** Upload step -> "Fill in manually instead" -> the blank editor. Call right after `signInEn`. */
export async function openManualEditor(page: Page): Promise<void> {
  await openUploadStep(page);
  await page.getByRole("link", { name: "Fill in manually instead" }).click();
  await expect(page).toHaveURL(/\/onboarding\/profile$/);
  await expect(page.getByRole("heading", { name: "Profile", level: 1 })).toBeVisible();
}
