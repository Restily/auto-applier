import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { toResumeState } from "./read";
import type { ResumeState } from "./status";

/** Client-side read of one resume row for polling (RLS: read-own). */
export async function readResume(id: string): Promise<ResumeState> {
  const { data, error } = await createSupabaseBrowserClient()
    .from("resumes")
    .select("id,file_name,status,error_code,extracted")
    .eq("id", id)
    .single();
  if (error) throw new Error("resume_read_failed");
  return toResumeState(data);
}
