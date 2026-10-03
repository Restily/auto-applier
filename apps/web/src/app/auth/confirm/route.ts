import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LINK_INVALID = "/reset-password?error=link_invalid";

/** The target of the emailed recovery link: turns the one-time token into a session, then lands on the reset form. */
export async function GET(request: NextRequest): Promise<never> {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  if (params.get("type") !== "recovery" || !tokenHash) redirect(LINK_INVALID);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error) redirect(LINK_INVALID);

  redirect(safeNextPath(params.get("next")) ?? "/reset-password");
}
