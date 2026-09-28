import { type NextRequest, NextResponse } from "next/server";

import { decideProxyRedirect } from "@/lib/auth/redirects";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, isSignedIn, hadAuthCookie } = await updateSession(request);

  const target = decideProxyRedirect({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isSignedIn,
    hadAuthCookie,
  });
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Carry refreshed session cookies onto the redirect so the browser and server stay in sync.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  // Excludes static assets, image files and ALL /api/* (route handlers check the
  // session themselves; this also avoids proxy body limits on uploads).
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
