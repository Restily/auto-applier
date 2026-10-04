/**
 * Methods a session created by the emailed recovery link can carry as its most recent `amr` entry. The link is
 * exchanged with `verifyOtp({ type: "recovery", token_hash })`; the local GoTrue records that as `otp` (checked
 * against the running stack: password sign-in -> `password`, recovery link -> `otp`, and a refresh keeps it), while
 * the PKCE flow can label it `recovery`. This app has no other OTP / magic-link sign-in, so `otp` is the link.
 */
const RECOVERY_METHODS: readonly string[] = ["recovery", "otp"];

/**
 * True when the session's most recent authentication (JWT `amr[0]`, newest first) came from the recovery email, i.e.
 * the person just proved control of the inbox. A password or Google session fails this, so a stolen or left-open
 * session cannot change the password without reauthentication (M1 review #10).
 */
export function isRecoverySession(claims: { amr?: unknown } | null | undefined): boolean {
  const amr = claims?.amr;
  if (!Array.isArray(amr) || amr.length === 0) return false;
  const latest: unknown = amr[0];
  const method = typeof latest === "string" ? latest : (latest as { method?: unknown } | null)?.method;
  return typeof method === "string" && RECOVERY_METHODS.includes(method);
}
