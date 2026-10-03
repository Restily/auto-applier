import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { requireUser } from "./session";

/** Where a signed-in user lands: the profile once it is complete, onboarding until then. */
export async function resolveLandingPath(): Promise<"/onboarding" | "/profile"> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("is_complete")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.is_complete === true ? "/profile" : "/onboarding";
}
