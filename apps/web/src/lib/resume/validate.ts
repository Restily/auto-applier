export const RESUME_MAX_BYTES = 5_242_880;

export type ResumeFileError = "resume.unsupported_type" | "resume.too_large" | "resume.empty";

/** Client-side pre-check; the API re-checks everything. Type first, then emptiness, then size. */
export function validateResumeFile(f: { name: string; size: number }): ResumeFileError | null {
  if (!/\.(pdf|docx)$/i.test(f.name)) return "resume.unsupported_type";
  if (f.size <= 0) return "resume.empty";
  if (f.size > RESUME_MAX_BYTES) return "resume.too_large";
  return null;
}
