const NEW_ACCOUNT_WINDOW_MS = 120_000;

/** `?error=` on the OAuth callback: a cancelled consent is neutral, anything else is a failure. */
export function callbackErrorRedirect(error: string | null): string | null {
  if (error === null) return null;
  return error === "access_denied" ? "/sign-in?notice=oauth_cancelled" : "/sign-in?notice=oauth_failed";
}

/** A Google sign-in creates the account on the fly; treat an account created moments ago as new. */
export function isNewAccount(u: { created_at: string; last_sign_in_at?: string | null }, now: Date): boolean {
  const created = Date.parse(u.created_at);
  if (Number.isNaN(created)) return false;
  return now.getTime() - created <= NEW_ACCOUNT_WINDOW_MS;
}
