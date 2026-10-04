import "server-only";

import { requireUser } from "@/lib/auth/session";
import { logDbError } from "@/lib/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

/** A real read on every call (S-004: reload shows exactly what was saved); RLS scopes it to the caller. */
export async function getProfile(): Promise<{ row: Tables<"candidate_profiles"> | null; accountEmail: string }> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("candidate_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) {
    logDbError("profile_load_failed", error);
    throw new Error("profile_load_failed");
  }
  return { row: data, accountEmail: user.email };
}
