/**
 * Methods a session created by the emailed recovery link can carry as its most recent `amr` entry. The link is
 * exchanged with `verifyOtp({ type: "recovery", token_hash })`; the local GoTrue records that as `otp` (checked
 * against the running stack: password sign-in -> `password`, recovery link -> `otp`, and a refresh keeps it), while
 * the PKCE flow can label it `recovery`. This app has no other OTP / magic-link sign-in, so `otp` is the link.
 */
const RECOVERY_METHODS: readonly string[] = ["recovery", "otp"];

/**
 * How long after the recovery link was used the session may still set a new password without the old one
 * (M1 review N3). The recovery session is an ordinary long-lived session and a refresh keeps `amr=otp`, so without a
 * bound it could change the password again for its whole lifetime. 15 minutes follows the GoTrue reauthentication
 * guidance.
 */
export const RECOVERY_MAX_AGE_SECONDS = 15 * 60;

/** Clock skew tolerated for an `amr` timestamp slightly ahead of this server. */
const CLOCK_SKEW_SECONDS = 60;

/**
 * True when the session's most recent authentication (JWT `amr[0]`, newest first) came from the recovery email and
 * happened within {@link RECOVERY_MAX_AGE_SECONDS}, i.e. the person just proved control of the inbox. A password or
 * Google session, or an old recovery session, fails this, so a stolen or left-open session cannot change the
 * password without reauthentication (M1 review #10, N3). The legacy string-only `amr` shape carries no timestamp, so
 * freshness cannot be shown and it fails closed.
 *
 * @param nowMs current time in epoch milliseconds; injectable for tests.
 */
export function isRecoverySession(
  claims: { amr?: unknown } | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  const amr = claims?.amr;
  if (!Array.isArray(amr) || amr.length === 0) return false;
  const latest: unknown = amr[0];
  if (typeof latest !== "object" || latest === null) return false;
  const { method, timestamp } = latest as { method?: unknown; timestamp?: unknown };
  if (typeof method !== "string" || !RECOVERY_METHODS.includes(method)) return false;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return false;
  const ageSeconds = nowMs / 1000 - timestamp;
  return ageSeconds <= RECOVERY_MAX_AGE_SECONDS && ageSeconds >= -CLOCK_SKEW_SECONDS;
}
