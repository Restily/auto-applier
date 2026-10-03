import "server-only";

import { getPublicEnv } from "@/lib/env.public";

/** Which optional sign-in methods this environment's GoTrue has enabled. Any failure means "not available". */
export async function getAuthProviders(fetchImpl: typeof fetch = fetch): Promise<{ google: boolean }> {
  try {
    const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
      next: { revalidate: 60 },
    });
    if (!response.ok) return { google: false };
    const body: unknown = await response.json();
    const external = (body as { external?: { google?: unknown } } | null)?.external;
    return { google: external?.google === true };
  } catch {
    return { google: false };
  }
}
