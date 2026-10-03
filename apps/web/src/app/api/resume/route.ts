import { NextResponse } from "next/server";

import { createApiClient } from "@/lib/api/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RESUME_MAX_BYTES } from "@/lib/resume/validate";

export const dynamic = "force-dynamic";

/** Multipart overhead allowance, mirrored from the file limit so the API never sees a huge body. */
const OVERHEAD_BYTES = 65_536;
/** A 5 MiB upload over the local hop needs more than the default 5 s. */
const UPLOAD_TIMEOUT_MS = 30_000;

export async function POST(request: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims?.claims?.sub) return NextResponse.json({ code: "auth.unauthorized" }, { status: 401 });
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return NextResponse.json({ code: "auth.unauthorized" }, { status: 401 });

  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > RESUME_MAX_BYTES + OVERHEAD_BYTES) {
    return NextResponse.json({ code: "resume.too_large" }, { status: 413 });
  }

  let file: File | null = null;
  try {
    const entry = (await request.formData()).get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    file = null;
  }
  if (!file) return NextResponse.json({ code: "resume.empty" }, { status: 422 });

  try {
    const api = createApiClient({ accessToken, timeoutMs: UPLOAD_TIMEOUT_MS });
    const { data, error: problem, response } = await api.POST("/v1/resumes", {
      // The generated type says `file: string`; the multipart body is a real File.
      body: { file: file as unknown as string },
      bodySerializer: (body) => {
        const form = new FormData();
        form.append("file", body.file as unknown as Blob);
        return form;
      },
    });
    return NextResponse.json(data ?? problem ?? {}, { status: response.status });
  } catch {
    return NextResponse.json({ code: "resume.upload_unavailable" }, { status: 502 });
  }
}
