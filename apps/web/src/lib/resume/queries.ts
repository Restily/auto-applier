import "server-only";

import { logDbError } from "@/lib/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { toResumeState } from "./read";
import type { ResumeState } from "./status";

/** The user's current resume row, or null. RLS scopes the read to the caller. */
export async function getCurrentResume(): Promise<ResumeState | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id,file_name,status,error_code,extracted")
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logDbError("resume_load_failed", error);
    throw new Error("resume_load_failed");
  }
  return data ? toResumeState(data) : null;
}
