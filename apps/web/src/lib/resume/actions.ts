"use server";

import { createApiClient } from "@/lib/api/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `conflict`: the API answered 409 (the resume is already being extracted, or already ready), so the client should poll the row rather than report a failure. */
export type RetryResult = { ok: boolean; conflict?: boolean };

/** Re-queues extraction for a failed (or stuck) resume; the client then polls the row again. */
export async function retryResumeExtraction(resumeId: string): Promise<RetryResult> {
  if (!UUID_RE.test(resumeId)) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims?.claims?.sub) return { ok: false };
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false };
  try {
    const { error: problem, response } = await createApiClient({ accessToken }).POST("/v1/resumes/{resume_id}/extraction", {
      params: { path: { resume_id: resumeId } },
    });
    if (problem === undefined) return { ok: true };
    return response?.status === 409 ? { ok: false, conflict: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}
