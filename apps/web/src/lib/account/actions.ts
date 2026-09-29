"use server";

import { redirect } from "next/navigation";

import { createApiClient } from "@/lib/api/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Deleting cascades through Auth, storage and the vault on the API side; give it more than the 5 s default. */
const DELETE_TIMEOUT_MS = 30_000;

export async function deleteAccountAction(confirmEmail: string): Promise<{ ok: false; error: "mismatch" | "failed" }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return { ok: false, error: "failed" };

  let status: number;
  try {
    const api = createApiClient({ accessToken, timeoutMs: DELETE_TIMEOUT_MS });
    const { response } = await api.POST("/v1/account/deletion", { body: { confirm_email: confirmEmail } });
    status = response.status;
  } catch {
    return { ok: false, error: "failed" };
  }

  if (status === 204) {
    // The user row is gone server-side; only the local cookies remain to be cleared.
    await supabase.auth.signOut({ scope: "local" });
    redirect("/account-deleted");
  }
  return { ok: false, error: status === 422 ? "mismatch" : "failed" };
}
