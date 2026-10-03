import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { localEnv } from "./local-env";

export type TestUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
  accessToken: string;
};

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Secret-key client. Tests only. */
export function adminClient(): SupabaseClient {
  const env = localEnv();
  return createClient(env.supabaseUrl, env.secretKey, NO_SESSION);
}

/** Publishable-key client with no session. */
export function anonClient(): SupabaseClient {
  const env = localEnv();
  return createClient(env.supabaseUrl, env.publishableKey, NO_SESSION);
}

export function uniqueEmail(prefix = "qa"): string {
  return `${prefix}+${randomUUID()}@example.test`;
}

/** Admin-creates a confirmed user, signs in with the password, returns a user-scoped client. */
export async function createTestUser(opts: { locale?: "en" | "ru"; password?: string } = {}): Promise<TestUser> {
  const email = uniqueEmail();
  const password = opts.password ?? `Pw-${randomUUID()}`;
  const admin = adminClient();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: opts.locale ? { locale: opts.locale } : {},
  });
  if (created.error || !created.data.user) throw new Error(`createUser failed: ${created.error?.message}`);
  const client = anonClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw new Error(`signIn failed: ${signedIn.error?.message}`);
  return { id: created.data.user.id, email, password, client, accessToken: signedIn.data.session.access_token };
}

/** Deletes a user; a missing user (404) is ignored. */
export async function deleteTestUser(id: string): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(id);
  if (error && error.status !== 404 && !/not found/i.test(error.message)) {
    throw new Error(`deleteUser failed: ${error.message}`);
  }
}
