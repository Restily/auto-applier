import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/env.public";

import type { Database } from "./database.types";

const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

/**
 * Refreshes the Supabase session cookies for this request (the @supabase/ssr
 * proxy pattern) and reports whether the visitor is signed in. Nothing may run
 * between creating the client and `getClaims()`, or sessions randomly drop.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; isSignedIn: boolean; hadAuthCookie: boolean }> {
  const hadAuthCookie = request.cookies.getAll().some(({ name }) => AUTH_COOKIE.test(name));
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isSignedIn = !error && Boolean(data?.claims?.sub);

  return { response, isSignedIn, hadAuthCookie };
}
