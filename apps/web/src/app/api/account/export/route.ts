import { NextResponse } from "next/server";

import { createApiClient } from "@/lib/api/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EXPORT_TIMEOUT_MS = 30_000;

export async function GET(): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims?.claims?.sub) return NextResponse.json({ code: "auth.unauthorized" }, { status: 401 });
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return NextResponse.json({ code: "auth.unauthorized" }, { status: 401 });

  try {
    const api = createApiClient({ accessToken, timeoutMs: EXPORT_TIMEOUT_MS });
    const { data, response } = await api.GET("/v1/account/export", { parseAs: "stream" });
    if (response.status !== 200 || !data) {
      return NextResponse.json({ code: "account.export_failed" }, { status: 502 });
    }
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    const disposition = response.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    return new Response(data as ReadableStream<Uint8Array>, { status: 200, headers });
  } catch {
    return NextResponse.json({ code: "account.export_failed" }, { status: 502 });
  }
}
