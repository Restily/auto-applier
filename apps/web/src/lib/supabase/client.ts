import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env.public";

import type { Database } from "./database.types";

/**
 * A Supabase client for Client Components. Uses the same public URL and
 * publishable key as the server client (see supabase/server.ts) — never the
 * secret key, which never reaches the browser.
 */
export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
