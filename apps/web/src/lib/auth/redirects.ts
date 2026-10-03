export const PROTECTED_PREFIXES = ["/onboarding", "/profile", "/settings"] as const;
export const SIGNED_OUT_ONLY = ["/sign-in", "/sign-up"] as const;

const MAX_NEXT_LENGTH = 512;

/**
 * Returns `next` only when it is a same-origin absolute path; anything that
 * could leave the origin (`//host`, `/\host`, schemes) or is unreasonably
 * long yields null so callers fall back to the app's own landing page.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (typeof next !== "string" || next.length === 0 || next.length > MAX_NEXT_LENGTH) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  // Control characters and backslashes are stripped or reinterpreted by browsers.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return null;
  return next;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function decideProxyRedirect(input: {
  pathname: string;
  search: string;
  isSignedIn: boolean;
  hadAuthCookie: boolean;
}): string | null {
  const { pathname, search, isSignedIn, hadAuthCookie } = input;

  if (!isSignedIn && PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return `/sign-in?next=${next}${hadAuthCookie ? "&reason=session_expired" : ""}`;
  }

  if (isSignedIn && SIGNED_OUT_ONLY.some((prefix) => matchesPrefix(pathname, prefix))) {
    return "/";
  }

  return null;
}
