import { z } from "zod";

/**
 * Public (browser-safe) environment — Supabase's URL and publishable key are
 * meant to be exposed to the client; RLS is what keeps data safe, not
 * secrecy of these values. Never add a secret key here.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function getPublicEnv(): { supabaseUrl: string; supabasePublishableKey: string } {
  // Referenced as literal `process.env.NEXT_PUBLIC_*` member expressions (not
  // a computed/dynamic lookup) so Next.js can inline them at build time for
  // both server and browser bundles.
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    const issue = result.error.issues[0];
    const name = issue?.path.join(".") || "environment";
    throw new Error(`Invalid environment variable ${name}: ${issue?.message ?? "validation failed"}`);
  }

  return {
    supabaseUrl: result.data.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
