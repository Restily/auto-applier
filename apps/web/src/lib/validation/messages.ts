/** Zod issue messages carry one of these keys; the UI renders them as t(`validation.${key}`). */
export const VALIDATION_KEYS = [
  "required",
  "email",
  "url",
  "minPassword",
  "maxLength",
  "maxItems",
  "salaryRange",
  "minTitles",
  "minSkills",
] as const;

export type ValidationKey = (typeof VALIDATION_KEYS)[number];

export function isValidationKey(value: unknown): value is ValidationKey {
  return typeof value === "string" && (VALIDATION_KEYS as readonly string[]).includes(value);
}
