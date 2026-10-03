/** Same rule as the backend: trim, then compare case-insensitively. An empty string never matches. */
export function emailsMatch(typed: string, accountEmail: string): boolean {
  const a = typed.trim().toLowerCase();
  return a.length > 0 && a === accountEmail.trim().toLowerCase();
}
