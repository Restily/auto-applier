import { z, type ZodError } from "zod";

import type { ValidationKey } from "@/lib/validation/messages";

/** Issue messages are ValidationKey values; the UI renders them as t(`validation.${key}`). */
const email = z.string().trim().min(1, "required").pipe(z.email("email"));
const newPassword = z.string().min(1, "required").min(8, "minPassword");

export const signUpSchema = z.object({ email, password: newPassword });
export const signInSchema = z.object({ email, password: z.string().min(1, "required") });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ password: newPassword });

/** The first issue per top-level field, as a ValidationKey. */
export function toFieldErrors<K extends string = string>(error: ZodError): Partial<Record<K, ValidationKey>> {
  const out: Record<string, ValidationKey> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as ValidationKey;
  }
  return out as Partial<Record<K, ValidationKey>>;
}
