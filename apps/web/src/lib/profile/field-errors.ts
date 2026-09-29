import { isValidationKey, type ValidationKey } from "@/lib/validation/messages";

/** First issue per dotted path, e.g. "links.linkedin" or "skills.3". Shared by the editor and the server action. */
export function issuesToFieldErrors(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): Record<string, ValidationKey> {
  const out: Record<string, ValidationKey> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    out[key] ??= isValidationKey(issue.message) ? issue.message : "required";
  }
  return out;
}
