"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationKey } from "@/lib/validation/messages";

import { missingProfileFields, type RequiredField } from "./completeness";
import { issuesToFieldErrors } from "./field-errors";
import { profileFormatSchema, toDbRow } from "./schema";

export type SaveProfileResult =
  | { ok: true; isComplete: boolean; missing: RequiredField[] }
  | { ok: false; fieldErrors: Record<string, ValidationKey> }
  | { ok: false; formError: "save_failed" };

/**
 * D1: only format errors block the write. Missing required fields are saved and reported back,
 * so the editor can highlight them and the checklist can list them.
 */
export async function saveProfile(input: unknown): Promise<SaveProfileResult> {
  const parsed = profileFormatSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, formError: "save_failed" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("candidate_profiles")
    .upsert({ ...toDbRow(parsed.data), user_id: user.id }, { onConflict: "user_id" });
  if (error) return { ok: false, formError: "save_failed" };

  revalidatePath("/onboarding");
  revalidatePath("/profile");
  const missing = missingProfileFields(parsed.data);
  return { ok: true, isComplete: missing.length === 0, missing };
}
