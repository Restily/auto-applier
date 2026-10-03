export type AuthErrorLike = { code?: string; status?: number; message?: string };

export type SignUpFormError = "duplicate_email" | "weak_password" | "rate_limited" | "unknown";
export type SignInFormError = "invalid_credentials" | "rate_limited";

const RATE_LIMIT_CODES = ["over_request_rate_limit", "over_email_send_rate_limit"];

function isRateLimited(e: AuthErrorLike): boolean {
  return e.status === 429 || (e.code !== undefined && RATE_LIMIT_CODES.includes(e.code));
}

export function mapSignUpError(e: AuthErrorLike): SignUpFormError {
  if (e.code === "user_already_exists" || e.code === "email_exists") return "duplicate_email";
  if (e.code === "weak_password") return "weak_password";
  if (isRateLimited(e)) return "rate_limited";
  return "unknown";
}

/** Everything except a rate limit is one message: never reveal which half of the credentials was wrong. */
export function mapSignInError(e: AuthErrorLike): SignInFormError {
  return isRateLimited(e) ? "rate_limited" : "invalid_credentials";
}
