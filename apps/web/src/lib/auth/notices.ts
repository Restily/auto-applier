export type SignInNotice =
  "oauth_cancelled"
  | "oauth_failed"
  | "password_updated"
  | "session_expired";

export function parseSignInNotice(value: string | undefined): SignInNotice | undefined {
  return value === "oauth_cancelled" ||
    value === "oauth_failed" ||
    value === "password_updated" ||
    value === "session_expired"
    ? value
    : undefined;
}
