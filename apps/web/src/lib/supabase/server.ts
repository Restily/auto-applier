import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env.public";

import type { Database } from "./database.types";

/**
 * A Supabase client for Server Components, Server Actions and Route
 * Handlers. Create a new one per request — never share a client across
 * requests. Reads the user's session from cookies, so RLS applies as that
 * user (this app never uses the secret/service-role key — see
 * SUPABASE_SECRET_KEY in the backend, which stays server-side in Python).
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` was called from a Server Component, which cannot write
          // cookies — documented @supabase/ssr behavior. Safe to ignore as
          // long as middleware (added when auth lands) refreshes the
          // session; until then no session is ever set from here.
        }
      },
    },
  });
}
